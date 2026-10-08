"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { loans, contacts, paymentLogs } from "@/lib/db/schema";
import { calculateEmi, calculateInterestOnly } from "@/lib/emi";
import { rupeesToPaise } from "@/lib/currency";

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

  return { ...row, paymentLogs: logs };
}

export async function listLoansByContact(contactId: number) {
  return db
    .select()
    .from(loans)
    .where(eq(loans.contactId, contactId))
    .orderBy(desc(loans.createdAt));
}
