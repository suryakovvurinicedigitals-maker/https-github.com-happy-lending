"use server";

import { revalidatePath } from "next/cache";
import { eq, ne, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { loans, paymentLogs, installments } from "@/lib/db/schema";

// Marking a loan "Received" also auto-pays every installment that isn't
// already PAID. The IDs of the installments this touched are stashed on the
// loan as JSON so revertMarkReceived knows exactly what to undo, without
// disturbing installments that were already PAID beforehand.
export async function markReceived(loanId: number, note: string) {
  const now = Date.now();

  const unpaidInstallments = await db
    .select()
    .from(installments)
    .where(and(eq(installments.loanId, loanId), ne(installments.status, "PAID")));

  let newlyReceivedPaise = 0;
  for (const installment of unpaidInstallments) {
    const alreadyPaidPaise = installment.amountPaidPaise ?? 0;
    newlyReceivedPaise += installment.amountPaise - alreadyPaidPaise;
    await db
      .update(installments)
      .set({
        status: "PAID",
        paidAt: now,
        amountPaidPaise: installment.amountPaise,
        previousAmountPaidPaise: installment.amountPaidPaise,
      })
      .where(eq(installments.id, installment.id));
  }

  await db
    .update(loans)
    .set({
      status: "RECEIVED",
      closedAt: now,
      updatedAt: now,
      preReceiveSnapshot: JSON.stringify(unpaidInstallments.map((i) => i.id)),
    })
    .where(eq(loans.id, loanId));

  await db.insert(paymentLogs).values({
    loanId,
    status: "RECEIVED",
    amountPaidPaise: newlyReceivedPaise || null,
    note: note || null,
    loggedAt: now,
  });

  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/");
}

// Undoes markReceived: restores whichever installments it auto-paid to their
// prior PARTIAL/PENDING state (installments already PAID before are left
// untouched) and reopens the loan.
export async function revertMarkReceived(loanId: number) {
  const now = Date.now();

  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));
  if (!loan) return { error: "Loan not found." };
  if (loan.status !== "RECEIVED") {
    return { error: "This loan hasn't been marked as received." };
  }

  const touchedIds: number[] = loan.preReceiveSnapshot
    ? JSON.parse(loan.preReceiveSnapshot)
    : [];

  let reversedPaise = 0;
  for (const id of touchedIds) {
    const [installment] = await db.select().from(installments).where(eq(installments.id, id));
    if (!installment || installment.status !== "PAID") continue;

    const previousPaise = installment.previousAmountPaidPaise ?? 0;
    reversedPaise += (installment.amountPaidPaise ?? 0) - previousPaise;

    await db
      .update(installments)
      .set({
        status: previousPaise > 0 ? "PARTIAL" : "PENDING",
        amountPaidPaise: previousPaise > 0 ? previousPaise : null,
        paidAt: null,
        previousAmountPaidPaise: null,
      })
      .where(eq(installments.id, id));
  }

  await db
    .update(loans)
    .set({ status: "PENDING", closedAt: null, preReceiveSnapshot: null, updatedAt: now })
    .where(eq(loans.id, loanId));

  await db.insert(paymentLogs).values({
    loanId,
    status: "PENDING",
    amountPaidPaise: reversedPaise ? -reversedPaise : null,
    note: "Mark as Received reverted",
    loggedAt: now,
  });

  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/");

  return {};
}

export async function logPayment(
  loanId: number,
  amountRupees: number | null,
  note: string
) {
  await db.insert(paymentLogs).values({
    loanId,
    status: "PENDING",
    amountPaidPaise: amountRupees ? Math.round(amountRupees * 100) : null,
    note: note || null,
    loggedAt: Date.now(),
  });

  revalidatePath(`/loans/${loanId}`);
}
