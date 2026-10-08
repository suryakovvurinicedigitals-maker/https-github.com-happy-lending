"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reminders, loans, contacts } from "@/lib/db/schema";
import { currentDuePeriod } from "@/lib/reminders";

export async function getReminder(loanId: number) {
  const [row] = await db
    .select()
    .from(reminders)
    .where(eq(reminders.loanId, loanId));
  return row ?? null;
}

export async function saveReminder(
  loanId: number,
  firstReminderDate: number,
  reminderMonths: number
) {
  const existing = await getReminder(loanId);

  if (existing) {
    await db
      .update(reminders)
      .set({ firstReminderDate, reminderMonths, lastSentPeriod: null })
      .where(eq(reminders.loanId, loanId));
  } else {
    await db.insert(reminders).values({
      loanId,
      firstReminderDate,
      reminderMonths,
      lastSentPeriod: null,
      createdAt: Date.now(),
    });
  }

  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/");
}

export async function deleteReminder(loanId: number) {
  await db.delete(reminders).where(eq(reminders.loanId, loanId));
  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/");
}

export async function markReminderSent(loanId: number, period: number) {
  await db
    .update(reminders)
    .set({ lastSentPeriod: period })
    .where(eq(reminders.loanId, loanId));

  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/");
}

export async function listDueReminders() {
  const rows = await db
    .select({
      reminder: reminders,
      loan: loans,
      contact: contacts,
    })
    .from(reminders)
    .innerJoin(loans, eq(reminders.loanId, loans.id))
    .innerJoin(contacts, eq(loans.contactId, contacts.id))
    .where(eq(loans.status, "PENDING"));

  return rows
    .map(({ reminder, loan, contact }) => {
      const period = currentDuePeriod(
        reminder.firstReminderDate,
        reminder.reminderMonths
      );
      if (period === null) return null;
      if (reminder.lastSentPeriod !== null && period <= reminder.lastSentPeriod) {
        return null;
      }
      return { reminder, loan, contact, period };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}
