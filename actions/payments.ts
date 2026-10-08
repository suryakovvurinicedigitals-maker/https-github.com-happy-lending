"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { loans, paymentLogs } from "@/lib/db/schema";

export async function markReceived(loanId: number, note: string) {
  const now = Date.now();

  await db
    .update(loans)
    .set({ status: "RECEIVED", closedAt: now, updatedAt: now })
    .where(eq(loans.id, loanId));

  await db.insert(paymentLogs).values({
    loanId,
    status: "RECEIVED",
    note: note || null,
    loggedAt: now,
  });

  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/");
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
