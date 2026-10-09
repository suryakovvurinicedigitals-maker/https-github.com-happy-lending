"use server";

import { revalidatePath } from "next/cache";
import { eq, and, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { installments, loans, paymentLogs } from "@/lib/db/schema";

export async function markInstallmentPaid(loanId: number, installmentId: number) {
  const now = Date.now();

  await db
    .update(installments)
    .set({ status: "PAID", paidAt: now })
    .where(eq(installments.id, installmentId));

  const [paid] = await db
    .select()
    .from(installments)
    .where(eq(installments.id, installmentId));

  if (paid) {
    await db.insert(paymentLogs).values({
      loanId,
      status: "PENDING",
      amountPaidPaise: paid.amountPaise,
      note: `Month ${paid.monthNumber} EMI paid`,
      loggedAt: now,
    });
  }

  const remaining = await db
    .select()
    .from(installments)
    .where(and(eq(installments.loanId, loanId), ne(installments.status, "PAID")));

  if (remaining.length === 0) {
    await db
      .update(loans)
      .set({ status: "RECEIVED", closedAt: now, updatedAt: now })
      .where(eq(loans.id, loanId));
  }

  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/");

  const remainingPaise = remaining.reduce((sum, i) => sum + i.amountPaise, 0);
  return { remainingPaise, loanClosed: remaining.length === 0 };
}
