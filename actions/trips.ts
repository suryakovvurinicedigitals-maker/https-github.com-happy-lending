"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { trips, tripExpenses, tripParticipants } from "@/lib/db/schema";
import { rupeesToPaise } from "@/lib/currency";
import { requireProfileId } from "@/lib/auth/session";
import { computeShares, paymentStatus } from "@/lib/tripSplit";

async function assertTripOwned(tripId: number, profileId: number) {
  const [trip] = await db
    .select({ id: trips.id })
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.profileId, profileId)));
  return trip !== undefined;
}

export async function listTrips() {
  const profileId = await requireProfileId();

  const tripRows = await db
    .select()
    .from(trips)
    .where(eq(trips.profileId, profileId))
    .orderBy(trips.createdAt);
  if (tripRows.length === 0) return [];

  const tripIds = tripRows.map((t) => t.id);
  const expenses = await db
    .select()
    .from(tripExpenses)
    .where(inArray(tripExpenses.tripId, tripIds));
  const participants = await db
    .select()
    .from(tripParticipants)
    .where(inArray(tripParticipants.tripId, tripIds));

  return tripRows.map((trip) => {
    const tripExpensesList = expenses.filter((e) => e.tripId === trip.id);
    const tripParticipantsList = participants.filter((p) => p.tripId === trip.id);
    const totalPaise = tripExpensesList.reduce((sum, e) => sum + e.amountPaise, 0);
    const shares = computeShares(totalPaise, tripParticipantsList);
    const settled =
      tripParticipantsList.length > 0 &&
      tripParticipantsList.every(
        (p) => paymentStatus(shares.get(p.id) ?? 0, p.amountPaidPaise) === "PAID"
      );
    return { trip, totalPaise, settled };
  });
}

const tripSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  tripDate: z.string().optional(),
  notes: z.string().trim().optional(),
});

export async function createTrip(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const profileId = await requireProfileId();

  const parsed = tripSchema.safeParse({
    name: formData.get("name"),
    tripDate: formData.get("tripDate") || undefined,
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const participantNames = formData
    .getAll("participantName")
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);

  const now = Date.now();
  const [created] = await db
    .insert(trips)
    .values({
      profileId,
      name: parsed.data.name,
      tripDate: parsed.data.tripDate ? new Date(parsed.data.tripDate).getTime() : null,
      notes: parsed.data.notes || null,
      createdAt: now,
    })
    .returning({ id: trips.id });

  if (participantNames.length > 0) {
    await db.insert(tripParticipants).values(
      participantNames.map((name) => ({
        tripId: created.id,
        name,
        createdAt: now,
      }))
    );
  }

  revalidatePath("/trips");
  redirect(`/trips/${created.id}`);
}

export async function getTrip(id: number) {
  const profileId = await requireProfileId();
  const [trip] = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, id), eq(trips.profileId, profileId)));
  if (!trip) return null;

  const expenses = await db
    .select()
    .from(tripExpenses)
    .where(eq(tripExpenses.tripId, id))
    .orderBy(tripExpenses.createdAt);
  const participants = await db
    .select()
    .from(tripParticipants)
    .where(eq(tripParticipants.tripId, id))
    .orderBy(tripParticipants.createdAt);

  return { trip, expenses, participants };
}

const expenseSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  amountRupees: z.coerce.number().positive("Enter a valid amount"),
  note: z.string().trim().optional(),
});

export async function addExpense(
  tripId: number,
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const profileId = await requireProfileId();
  if (!(await assertTripOwned(tripId, profileId))) {
    return { error: "Trip not found" };
  }

  const parsed = expenseSchema.safeParse({
    description: formData.get("description"),
    amountRupees: formData.get("amountRupees"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.insert(tripExpenses).values({
    tripId,
    description: parsed.data.description,
    amountPaise: rupeesToPaise(parsed.data.amountRupees),
    note: parsed.data.note || null,
    createdAt: Date.now(),
  });

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  return {};
}

export async function deleteExpense(expenseId: number, tripId: number) {
  const profileId = await requireProfileId();
  if (!(await assertTripOwned(tripId, profileId))) return;

  await db
    .delete(tripExpenses)
    .where(and(eq(tripExpenses.id, expenseId), eq(tripExpenses.tripId, tripId)));

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
}

const participantSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().optional(),
});

export async function addParticipant(
  tripId: number,
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const profileId = await requireProfileId();
  if (!(await assertTripOwned(tripId, profileId))) {
    return { error: "Trip not found" };
  }

  const parsed = participantSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.insert(tripParticipants).values({
    tripId,
    name: parsed.data.name,
    phone: parsed.data.phone ? parsed.data.phone.replace(/\D/g, "") || null : null,
    createdAt: Date.now(),
  });

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  return {};
}

export async function deleteParticipant(participantId: number, tripId: number) {
  const profileId = await requireProfileId();
  if (!(await assertTripOwned(tripId, profileId))) return;

  await db
    .delete(tripParticipants)
    .where(
      and(eq(tripParticipants.id, participantId), eq(tripParticipants.tripId, tripId))
    );

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
}

export async function setParticipantShare(
  participantId: number,
  tripId: number,
  customShareRupeesInput: string
): Promise<{ error?: string }> {
  const profileId = await requireProfileId();
  if (!(await assertTripOwned(tripId, profileId))) {
    return { error: "Trip not found" };
  }

  const trimmed = customShareRupeesInput.trim();
  let customSharePaise: number | null = null;
  if (trimmed !== "") {
    const parsed = z.coerce.number().positive().safeParse(trimmed);
    if (!parsed.success) {
      return { error: "Enter a valid amount" };
    }
    customSharePaise = rupeesToPaise(parsed.data);
  }

  await db
    .update(tripParticipants)
    .set({ customSharePaise })
    .where(
      and(eq(tripParticipants.id, participantId), eq(tripParticipants.tripId, tripId))
    );

  revalidatePath(`/trips/${tripId}`);
  return {};
}

export async function setParticipantPaid(
  participantId: number,
  tripId: number,
  amountPaidRupeesInput: string
): Promise<{ error?: string }> {
  const profileId = await requireProfileId();
  if (!(await assertTripOwned(tripId, profileId))) {
    return { error: "Trip not found" };
  }

  const trimmed = amountPaidRupeesInput.trim();
  let amountPaidPaise = 0;
  if (trimmed !== "") {
    const parsed = z.coerce.number().min(0).safeParse(trimmed);
    if (!parsed.success) {
      return { error: "Enter a valid amount" };
    }
    amountPaidPaise = rupeesToPaise(parsed.data);
  }

  await db
    .update(tripParticipants)
    .set({ amountPaidPaise })
    .where(
      and(eq(tripParticipants.id, participantId), eq(tripParticipants.tripId, tripId))
    );

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  return {};
}

export async function setParticipantFullyPaid(
  participantId: number,
  tripId: number
): Promise<{ error?: string }> {
  const profileId = await requireProfileId();
  if (!(await assertTripOwned(tripId, profileId))) {
    return { error: "Trip not found" };
  }

  const expenses = await db
    .select()
    .from(tripExpenses)
    .where(eq(tripExpenses.tripId, tripId));
  const participants = await db
    .select()
    .from(tripParticipants)
    .where(eq(tripParticipants.tripId, tripId));

  const totalPaise = expenses.reduce((sum, e) => sum + e.amountPaise, 0);
  const shares = computeShares(totalPaise, participants);
  const amountPaidPaise = shares.get(participantId) ?? 0;

  await db
    .update(tripParticipants)
    .set({ amountPaidPaise })
    .where(
      and(eq(tripParticipants.id, participantId), eq(tripParticipants.tripId, tripId))
    );

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  return {};
}

export async function deleteTrip(id: number) {
  const profileId = await requireProfileId();
  if (!(await assertTripOwned(id, profileId))) return;

  await db.delete(tripExpenses).where(eq(tripExpenses.tripId, id));
  await db.delete(tripParticipants).where(eq(tripParticipants.tripId, id));
  await db.delete(trips).where(eq(trips.id, id));

  revalidatePath("/trips");
  redirect("/trips");
}
