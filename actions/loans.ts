"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  loans,
  contacts,
  paymentLogs,
  installments,
  attachments,
  reminders,
} from "@/lib/db/schema";
import {
  calculateEmi,
  calculateEmiReducing,
  calculateInterestOnly,
  buildRepaymentSchedule,
  buildReducingBalanceSchedule,
  rebuildRemainingSchedule,
  rebuildRemainingReducingBalanceSchedule,
} from "@/lib/emi";
import { rupeesToPaise } from "@/lib/currency";
import { deleteUploadsForLoan } from "@/lib/uploads";

const loanSchema = z.object({
  contactId: z.coerce.number().int().positive(),
  principalRupees: z.coerce.number().positive(),
  annualRatePercent: z.coerce.number().min(0),
  tenureMonths: z.coerce.number().int().positive(),
  startDate: z.string().min(1),
  repaymentType: z.enum(["EMI", "INTEREST_ONLY"]),
  interestMethod: z.enum(["FLAT", "REDUCING"]).default("FLAT"),
});

export async function createLoan(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = loanSchema.safeParse({
    contactId: formData.get("contactId"),
    principalRupees: formData.get("principalRupees"),
    annualRatePercent: formData.get("annualRatePercent"),
    tenureMonths: formData.get("tenureMonths"),
    startDate: formData.get("startDate"),
    repaymentType: formData.get("repaymentType"),
    interestMethod: formData.get("interestMethod") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const {
    contactId,
    principalRupees,
    annualRatePercent,
    tenureMonths,
    startDate,
    repaymentType,
    interestMethod,
  } = parsed.data;

  const principalPaise = rupeesToPaise(principalRupees);
  // Reducing balance only makes sense for amortized EMI loans — an
  // interest-only "bullet" loan never actually reduces its balance until
  // the final month, so flat and reducing are identical for it.
  const effectiveInterestMethod = repaymentType === "EMI" ? interestMethod : "FLAT";

  const { emiPaise, totalInterestPaise, finalTotalPaise } =
    repaymentType === "INTEREST_ONLY"
      ? ((r) => ({
          emiPaise: r.monthlyInterestPaise,
          totalInterestPaise: r.totalInterestPaise,
          finalTotalPaise: r.finalTotalPaise,
        }))(calculateInterestOnly(principalPaise, annualRatePercent, tenureMonths))
      : effectiveInterestMethod === "REDUCING"
        ? calculateEmiReducing(principalPaise, annualRatePercent, tenureMonths)
        : calculateEmi(principalPaise, annualRatePercent, tenureMonths);

  const now = Date.now();
  const [created] = await db
    .insert(loans)
    .values({
      contactId,
      principalPaise,
      annualRatePercent,
      tenureMonths,
      repaymentType,
      interestMethod: effectiveInterestMethod,
      emiPaise,
      totalInterestPaise,
      finalTotalPaise,
      startDate: new Date(startDate).getTime(),
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: loans.id });

  const schedule =
    effectiveInterestMethod === "REDUCING"
      ? buildReducingBalanceSchedule({
          startDate: new Date(startDate).getTime(),
          tenureMonths,
          principalPaise,
          annualRatePercent,
          emiPaise,
        })
      : buildRepaymentSchedule({
          startDate: new Date(startDate).getTime(),
          tenureMonths,
          repaymentType,
          principalPaise,
          totalInterestPaise,
        });
  await db.insert(installments).values(
    schedule.map((entry) => ({
      loanId: created.id,
      monthNumber: entry.monthNumber,
      dueDate: entry.dueDate,
      principalPaise: entry.principalPaise,
      interestPaise: entry.interestPaise,
      amountPaise: entry.amountPaise,
      status: "PENDING" as const,
      createdAt: now,
    }))
  );

  revalidatePath("/");
  revalidatePath(`/contacts/${contactId}`);
  redirect(`/loans/${created.id}?created=1`);
}

export async function getLoan(id: number) {
  const [row] = await db
    .select({
      loan: loans,
      contact: contacts,
    })
    .from(loans)
    .innerJoin(contacts, eq(loans.contactId, contacts.id))
    .where(eq(loans.id, id));

  if (!row) return null;

  const logs = await db
    .select()
    .from(paymentLogs)
    .where(eq(paymentLogs.loanId, id))
    .orderBy(desc(paymentLogs.loggedAt));

  const schedule = await db
    .select()
    .from(installments)
    .where(eq(installments.loanId, id))
    .orderBy(installments.monthNumber);

  return { ...row, paymentLogs: logs, installments: schedule };
}

export async function listLoansByContact(contactId: number) {
  return db
    .select()
    .from(loans)
    .where(eq(loans.contactId, contactId))
    .orderBy(desc(loans.createdAt));
}

const tenureSchema = z.object({
  tenureMonths: z.coerce.number().int().positive(),
});

const rateSchema = z.object({
  annualRatePercent: z.coerce.number().min(0),
});

// Shared by updateTenure and updateRate: recalculates EMI/interest/totals for
// the new terms and rebuilds only the not-yet-paid tail of the schedule.
// Already-PAID installments are never touched.
async function applyLoanTermsChange(
  loanId: number,
  changes: { tenureMonths?: number; annualRatePercent?: number }
): Promise<{ error?: string }> {
  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));
  if (!loan) return { error: "Loan not found" };
  if (loan.status !== "PENDING") {
    return { error: "Only pending loans can have their terms edited" };
  }

  const newTenureMonths = changes.tenureMonths ?? loan.tenureMonths;
  const newAnnualRatePercent = changes.annualRatePercent ?? loan.annualRatePercent;

  const existingInstallments = await db
    .select()
    .from(installments)
    .where(eq(installments.loanId, loanId))
    .orderBy(installments.monthNumber);

  if (existingInstallments.some((i) => i.status === "PARTIAL")) {
    return {
      error:
        "This loan has a partially paid installment. Fully settle or wait until it's complete before editing the loan terms.",
    };
  }

  const paid = existingInstallments.filter((i) => i.status === "PAID");
  const paidMonths = paid.length;
  const paidPrincipalPaise = paid.reduce((sum, i) => sum + (i.principalPaise ?? 0), 0);
  const paidInterestPaise = paid.reduce((sum, i) => sum + (i.interestPaise ?? 0), 0);

  if (newTenureMonths <= paidMonths) {
    return {
      error: `New tenure must be greater than the ${paidMonths} month(s) already paid`,
    };
  }

  if (newTenureMonths === loan.tenureMonths && newAnnualRatePercent === loan.annualRatePercent) {
    return {};
  }

  const remainingPrincipalPaise = loan.principalPaise - paidPrincipalPaise;

  let emiPaise: number;
  let totalInterestPaise: number;
  let finalTotalPaise: number;
  let remainingSchedule: ReturnType<typeof rebuildRemainingSchedule>;

  if (loan.repaymentType === "INTEREST_ONLY") {
    const r = calculateInterestOnly(loan.principalPaise, newAnnualRatePercent, newTenureMonths);
    emiPaise = r.monthlyInterestPaise;
    totalInterestPaise = r.totalInterestPaise;
    finalTotalPaise = r.finalTotalPaise;
    remainingSchedule = rebuildRemainingSchedule({
      startDate: loan.startDate,
      newTenureMonths,
      repaymentType: loan.repaymentType,
      principalPaise: loan.principalPaise,
      newTotalInterestPaise: totalInterestPaise,
      paidMonths,
      paidPrincipalPaise,
      paidInterestPaise,
    });
  } else if (loan.interestMethod === "REDUCING") {
    const remainingMonths = newTenureMonths - paidMonths;
    const r = calculateEmiReducing(remainingPrincipalPaise, newAnnualRatePercent, remainingMonths);
    emiPaise = r.emiPaise;
    totalInterestPaise = paidInterestPaise + r.totalInterestPaise;
    finalTotalPaise = loan.principalPaise + totalInterestPaise;
    remainingSchedule = rebuildRemainingReducingBalanceSchedule({
      startDate: loan.startDate,
      newTenureMonths,
      annualRatePercent: newAnnualRatePercent,
      paidMonths,
      remainingPrincipalPaise,
    });
  } else {
    const r = calculateEmi(loan.principalPaise, newAnnualRatePercent, newTenureMonths);
    emiPaise = r.emiPaise;
    totalInterestPaise = r.totalInterestPaise;
    finalTotalPaise = r.finalTotalPaise;
    remainingSchedule = rebuildRemainingSchedule({
      startDate: loan.startDate,
      newTenureMonths,
      repaymentType: loan.repaymentType,
      principalPaise: loan.principalPaise,
      newTotalInterestPaise: totalInterestPaise,
      paidMonths,
      paidPrincipalPaise,
      paidInterestPaise,
    });
  }

  const now = Date.now();

  await db
    .delete(installments)
    .where(and(eq(installments.loanId, loanId), eq(installments.status, "PENDING")));

  await db.insert(installments).values(
    remainingSchedule.map((entry) => ({
      loanId,
      monthNumber: entry.monthNumber,
      dueDate: entry.dueDate,
      principalPaise: entry.principalPaise,
      interestPaise: entry.interestPaise,
      amountPaise: entry.amountPaise,
      status: "PENDING" as const,
      createdAt: now,
    }))
  );

  await db
    .update(loans)
    .set({
      tenureMonths: newTenureMonths,
      annualRatePercent: newAnnualRatePercent,
      emiPaise,
      totalInterestPaise,
      finalTotalPaise,
      updatedAt: now,
    })
    .where(eq(loans.id, loanId));

  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/");
  revalidatePath(`/contacts/${loan.contactId}`);

  return {};
}

export async function updateTenure(
  loanId: number,
  newTenureMonthsInput: number
): Promise<{ error?: string }> {
  const parsed = tenureSchema.safeParse({ tenureMonths: newTenureMonthsInput });
  if (!parsed.success) {
    return { error: "Enter a valid tenure in months" };
  }
  return applyLoanTermsChange(loanId, { tenureMonths: parsed.data.tenureMonths });
}

export async function updateRate(
  loanId: number,
  newAnnualRatePercentInput: number
): Promise<{ error?: string }> {
  const parsed = rateSchema.safeParse({ annualRatePercent: newAnnualRatePercentInput });
  if (!parsed.success) {
    return { error: "Enter a valid interest rate" };
  }
  return applyLoanTermsChange(loanId, {
    annualRatePercent: parsed.data.annualRatePercent,
  });
}

export async function deleteLoan(loanId: number) {
  const [row] = await db
    .select({ contactId: loans.contactId })
    .from(loans)
    .where(eq(loans.id, loanId));
  if (!row) return;

  await deleteUploadsForLoan(loanId);

  await db.delete(attachments).where(eq(attachments.loanId, loanId));
  await db.delete(installments).where(eq(installments.loanId, loanId));
  await db.delete(paymentLogs).where(eq(paymentLogs.loanId, loanId));
  await db.delete(reminders).where(eq(reminders.loanId, loanId));
  await db.delete(loans).where(eq(loans.id, loanId));

  revalidatePath("/");
  revalidatePath(`/contacts/${row.contactId}`);
  redirect("/");
}
