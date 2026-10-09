"use server";

import { revalidatePath } from "next/cache";
import { eq, and, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { installments, loans, paymentLogs } from "@/lib/db/schema";

export async function markInstallmentPaid(loanId: number, installmentId: number) {
  const now = Date.now();

  const [installment] = await db
    .select()
    .from(installments)
    .where(eq(installments.id, installmentId));
  if (!installment) return { remainingPaise: 0, loanClosed: false };

  const alreadyPaidPaise = installment.amountPaidPaise ?? 0;
  const newlyReceivedPaise = installment.amountPaise - alreadyPaidPaise;

  await db
    .update(installments)
    .set({
      status: "PAID",
      paidAt: now,
      amountPaidPaise: installment.amountPaise,
      previousAmountPaidPaise: installment.amountPaidPaise,
    })
    .where(eq(installments.id, installmentId));

  await db.insert(paymentLogs).values({
    loanId,
    status: "PENDING",
    amountPaidPaise: newlyReceivedPaise,
    note: `Month ${installment.monthNumber} EMI paid`,
    loggedAt: now,
  });

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

  const remainingPaise = remaining.reduce(
    (sum, i) => sum + (i.amountPaise - (i.amountPaidPaise ?? 0)),
    0
  );
  return { remainingPaise, loanClosed: remaining.length === 0 };
}

export async function recordPartialPayment(
  loanId: number,
  installmentId: number,
  amountReceivedRupees: number
) {
  const now = Date.now();
  const amountReceivedPaise = Math.round(amountReceivedRupees * 100);
  if (amountReceivedPaise <= 0) {
    return { error: "Enter an amount greater than zero." };
  }

  const [installment] = await db
    .select()
    .from(installments)
    .where(eq(installments.id, installmentId));
  if (!installment) return { error: "Installment not found." };

  const previouslyPaidPaise = installment.amountPaidPaise ?? 0;
  const newPaidPaise = previouslyPaidPaise + amountReceivedPaise;
  const isFullySettled = newPaidPaise >= installment.amountPaise;

  await db
    .update(installments)
    .set({
      status: isFullySettled ? "PAID" : "PARTIAL",
      amountPaidPaise: newPaidPaise,
      paidAt: isFullySettled ? now : null,
      previousAmountPaidPaise: installment.amountPaidPaise,
    })
    .where(eq(installments.id, installmentId));

  const remainingThisMonthPaise = Math.max(installment.amountPaise - newPaidPaise, 0);
  await db.insert(paymentLogs).values({
    loanId,
    status: "PENDING",
    amountPaidPaise: amountReceivedPaise,
    note: isFullySettled
      ? `Month ${installment.monthNumber} EMI paid (final partial installment)`
      : `Month ${installment.monthNumber} partial payment, ${remainingThisMonthPaise} paise remaining this month`,
    loggedAt: now,
  });

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

  const remainingPaise = remaining.reduce(
    (sum, i) => sum + (i.amountPaise - (i.amountPaidPaise ?? 0)),
    0
  );
  return {
    remainingThisMonthPaise,
    remainingPaise,
    loanClosed: remaining.length === 0,
  };
}

// Undoes the most recent markInstallmentPaid/recordPartialPayment call on
// this installment, restoring whatever PARTIAL/PENDING state it had just
// before that action (not necessarily all the way back to unpaid).
export async function revertInstallmentPayment(loanId: number, installmentId: number) {
  const now = Date.now();

  const [installment] = await db
    .select()
    .from(installments)
    .where(eq(installments.id, installmentId));
  if (!installment) return { error: "Installment not found." };
  if (installment.status === "PENDING") {
    return { error: "This installment hasn't been paid yet." };
  }

  const previousPaise = installment.previousAmountPaidPaise ?? 0;
  const reversedPaise = (installment.amountPaidPaise ?? 0) - previousPaise;
  const newStatus = previousPaise > 0 ? "PARTIAL" : "PENDING";

  await db
    .update(installments)
    .set({
      status: newStatus,
      amountPaidPaise: previousPaise > 0 ? previousPaise : null,
      paidAt: null,
      previousAmountPaidPaise: null,
    })
    .where(eq(installments.id, installmentId));

  await db.insert(paymentLogs).values({
    loanId,
    status: "PENDING",
    amountPaidPaise: -reversedPaise,
    note: `Month ${installment.monthNumber} payment reverted`,
    loggedAt: now,
  });

  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));
  if (loan && loan.status === "RECEIVED") {
    await db
      .update(loans)
      .set({ status: "PENDING", closedAt: null, updatedAt: now })
      .where(eq(loans.id, loanId));
  }

  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/");

  return {};
}
