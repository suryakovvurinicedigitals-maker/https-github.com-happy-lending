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
  calculateInterestOnly,
  buildRepaymentSchedule,
  rebuildRemainingSchedule,
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
  } = parsed.data;

  const principalPaise = rupeesToPaise(principalRupees);

  const { emiPaise, totalInterestPaise, finalTotalPaise } =
    repaymentType === "INTEREST_ONLY"
      ? ((r) => ({
          emiPaise: r.monthlyInterestPaise,
          totalInterestPaise: r.totalInterestPaise,
          finalTotalPaise: r.finalTotalPaise,
        }))(calculateInterestOnly(principalPaise, annualRatePercent, tenureMonths))
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
      emiPaise,
      totalInterestPaise,
      finalTotalPaise,
      startDate: new Date(startDate).getTime(),
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: loans.id });

  const schedule = buildRepaymentSchedule({
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

export async function updateTenure(
  loanId: number,
  newTenureMonthsInput: number
): Promise<{ error?: string }> {
  const parsed = tenureSchema.safeParse({ tenureMonths: newTenureMonthsInput });
  if (!parsed.success) {
    return { error: "Enter a valid tenure in months" };
  }
  const { tenureMonths: newTenureMonths } = parsed.data;

  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));
  if (!loan) return { error: "Loan not found" };
  if (loan.status !== "PENDING") {
    return { error: "Only pending loans can have their tenure edited" };
  }

  const existingInstallments = await db
    .select()
    .from(installments)
    .where(eq(installments.loanId, loanId))
    .orderBy(installments.monthNumber);

  if (existingInstallments.some((i) => i.status === "PARTIAL")) {
    return {
      error:
        "This loan has a partially paid installment. Fully settle or wait until it's complete before editing the tenure.",
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

  if (newTenureMonths === loan.tenureMonths) {
    return {};
  }

  const { emiPaise, totalInterestPaise, finalTotalPaise } =
    loan.repaymentType === "INTEREST_ONLY"
      ? ((r) => ({
          emiPaise: r.monthlyInterestPaise,
          totalInterestPaise: r.totalInterestPaise,
          finalTotalPaise: r.finalTotalPaise,
        }))(calculateInterestOnly(loan.principalPaise, loan.annualRatePercent, newTenureMonths))
      : calculateEmi(loan.principalPaise, loan.annualRatePercent, newTenureMonths);

  const remainingSchedule = rebuildRemainingSchedule({
    startDate: loan.startDate,
    newTenureMonths,
    repaymentType: loan.repaymentType,
    principalPaise: loan.principalPaise,
    newTotalInterestPaise: totalInterestPaise,
    paidMonths,
    paidPrincipalPaise,
    paidInterestPaise,
  });

  const now = Date.now();

  // Already-PAID installments are never touched — only PENDING rows (the
  // not-yet-paid tail) are replaced with the recalculated remaining schedule.
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
