"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { reminders, loans, contacts } from "@/lib/db/schema";
import { currentDuePeriod } from "@/lib/reminders";
import { requireProfileId } from "@/lib/auth/session";

async function assertLoanOwned(loanId: number, profileId: number) {
  const [loan] = await db
    .select({ id: loans.id })
    .from(loans)
    .where(and(eq(loans.id, loanId), eq(loans.profileId, profileId)));
  return loan !== undefined;
}

export async function getReminder(loanId: number) {
  const profileId = await requireProfileId();
  if (!(await assertLoanOwned(loanId, profileId))) return null;

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
  const profileId = await requireProfileId();
  if (!(await assertLoanOwned(loanId, profileId))) return;

  const [existing] = await db
    .select()
    .from(reminders)
    .where(eq(reminders.loanId, loanId));

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
  const profileId = await requireProfileId();
  if (!(await assertLoanOwned(loanId, profileId))) return;

  await db.delete(reminders).where(eq(reminders.loanId, loanId));
  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/");
}

export async function markReminderSent(loanId: number, period: number) {
  const profileId = await requireProfileId();
  if (!(await assertLoanOwned(loanId, profileId))) return;

  await db
    .update(reminders)
    .set({ lastSentPeriod: period })
    .where(eq(reminders.loanId, loanId));

  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/");
}

export async function listDueReminders(profileId: number) {
  const rows = await db
    .select({
      reminder: reminders,
      loan: loans,
      contact: contacts,
    })
    .from(reminders)
    .innerJoin(loans, eq(reminders.loanId, loans.id))
    .innerJoin(contacts, eq(loans.contactId, contacts.id))
    .where(and(eq(loans.status, "PENDING"), eq(loans.profileId, profileId)));

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
