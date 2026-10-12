"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  profiles,
  contacts,
  loans,
  paymentLogs,
  installments,
  attachments,
  reminders,
} from "@/lib/db/schema";
import { getSession, requireProfileId } from "@/lib/auth/session";
import { hashPin, verifyPin, isValidPinFormat } from "@/lib/auth/pin";
import { generateRecoveryCode } from "@/lib/auth/recoveryCode";
import { deleteUploadsForLoan } from "@/lib/uploads";

export async function listProfiles() {
  return db
    .select({ id: profiles.id, name: profiles.name })
    .from(profiles)
    .orderBy(profiles.name);
}

export async function hasRecoveryCode() {
  const profileId = await requireProfileId();
  const [profile] = await db
    .select({ recoveryCodeHash: profiles.recoveryCodeHash })
    .from(profiles)
    .where(eq(profiles.id, profileId));
  return profile?.recoveryCodeHash != null;
}

export async function createProfile(
  _prevState: { error?: string; success?: boolean; recoveryCode?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean; recoveryCode?: string }> {
  const name = formData.get("name");
  const pin = formData.get("pin");
  const confirmPin = formData.get("confirmPin");

  if (typeof name !== "string" || name.trim().length === 0) {
    return { error: "Name is required." };
  }
  if (typeof pin !== "string" || typeof confirmPin !== "string") {
    return { error: "PIN is required." };
  }
  if (!isValidPinFormat(pin)) {
    return { error: "PIN must be 4-6 digits." };
  }
  if (pin !== confirmPin) {
    return { error: "PINs do not match." };
  }

  const trimmedName = name.trim();
  const [existing] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.name, trimmedName));
  if (existing) {
    return { error: "A profile with that name already exists." };
  }

  const recoveryCode = generateRecoveryCode();
  const [created] = await db
    .insert(profiles)
    .values({
      name: trimmedName,
      pinHash: hashPin(pin),
      recoveryCodeHash: hashPin(recoveryCode),
      createdAt: Date.now(),
    })
    .returning({ id: profiles.id });

  const session = await getSession();
  session.profileId = created.id;
  await session.save();

  return { success: true, recoveryCode };
}

export async function loginToProfile(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const profileId = Number(formData.get("profileId"));
  const pin = formData.get("pin");

  if (!Number.isInteger(profileId) || profileId <= 0) {
    return { error: "Invalid profile." };
  }
  if (typeof pin !== "string" || pin.length === 0) {
    return { error: "PIN is required." };
  }

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId));
  if (!profile || !verifyPin(pin, profile.pinHash)) {
    return { error: "Incorrect PIN." };
  }

  const session = await getSession();
  session.profileId = profile.id;
  await session.save();

  redirect("/");
}

export async function changePin(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const profileId = await requireProfileId();
  const pin = formData.get("pin");
  const confirmPin = formData.get("confirmPin");

  if (typeof pin !== "string" || typeof confirmPin !== "string") {
    return { error: "PIN is required." };
  }
  if (!isValidPinFormat(pin)) {
    return { error: "PIN must be 4-6 digits." };
  }
  if (pin !== confirmPin) {
    return { error: "PINs do not match." };
  }

  await db
    .update(profiles)
    .set({ pinHash: hashPin(pin) })
    .where(eq(profiles.id, profileId));

  return { success: true };
}

export async function resetPinWithRecoveryCode(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const profileId = Number(formData.get("profileId"));
  const recoveryCode = formData.get("recoveryCode");
  const pin = formData.get("pin");
  const confirmPin = formData.get("confirmPin");

  if (!Number.isInteger(profileId) || profileId <= 0) {
    return { error: "Invalid profile." };
  }
  if (typeof recoveryCode !== "string" || recoveryCode.trim().length === 0) {
    return { error: "Recovery code is required." };
  }
  if (typeof pin !== "string" || typeof confirmPin !== "string") {
    return { error: "PIN is required." };
  }
  if (!isValidPinFormat(pin)) {
    return { error: "PIN must be 4-6 digits." };
  }
  if (pin !== confirmPin) {
    return { error: "PINs do not match." };
  }

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId));
  if (
    !profile ||
    !profile.recoveryCodeHash ||
    !verifyPin(recoveryCode.trim(), profile.recoveryCodeHash)
  ) {
    return { error: "Incorrect recovery code." };
  }

  await db
    .update(profiles)
    .set({ pinHash: hashPin(pin), recoveryCodeHash: null })
    .where(eq(profiles.id, profileId));

  const session = await getSession();
  session.profileId = profile.id;
  await session.save();

  redirect("/");
}

export async function generateNewRecoveryCode(
  _prevState: { error?: string; success?: boolean; recoveryCode?: string } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean; recoveryCode?: string }> {
  const profileId = await requireProfileId();
  const pin = formData.get("pin");

  if (typeof pin !== "string" || pin.length === 0) {
    return { error: "Current PIN is required." };
  }

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId));
  if (!profile || !verifyPin(pin, profile.pinHash)) {
    return { error: "Incorrect PIN." };
  }

  const recoveryCode = generateRecoveryCode();
  await db
    .update(profiles)
    .set({ recoveryCodeHash: hashPin(recoveryCode) })
    .where(eq(profiles.id, profileId));

  return { success: true, recoveryCode };
}

export async function deleteProfile(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const profileId = await requireProfileId();
  const pin = formData.get("pin");

  if (typeof pin !== "string" || pin.length === 0) {
    return { error: "Current PIN is required." };
  }

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId));
  if (!profile || !verifyPin(pin, profile.pinHash)) {
    return { error: "Incorrect PIN." };
  }

  const ownedLoans = await db
    .select({ id: loans.id })
    .from(loans)
    .where(eq(loans.profileId, profileId));

  for (const loan of ownedLoans) {
    await deleteUploadsForLoan(loan.id);
    await db.delete(attachments).where(eq(attachments.loanId, loan.id));
    await db.delete(installments).where(eq(installments.loanId, loan.id));
    await db.delete(paymentLogs).where(eq(paymentLogs.loanId, loan.id));
    await db.delete(reminders).where(eq(reminders.loanId, loan.id));
    await db.delete(loans).where(eq(loans.id, loan.id));
  }

  await db.delete(contacts).where(eq(contacts.profileId, profileId));
  await db.delete(profiles).where(eq(profiles.id, profileId));

  const session = await getSession();
  session.destroy();
  redirect("/login");
}
