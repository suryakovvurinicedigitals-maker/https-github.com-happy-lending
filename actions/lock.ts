"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireProfileId } from "@/lib/auth/session";
import { verifyPin } from "@/lib/auth/pin";

export async function verifyUnlockPin(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const profileId = await requireProfileId();
  const pin = formData.get("pin");

  if (typeof pin !== "string" || pin.length === 0) {
    return { error: "PIN is required." };
  }

  const [profile] = await db
    .select({ pinHash: profiles.pinHash })
    .from(profiles)
    .where(eq(profiles.id, profileId));

  if (!profile || !verifyPin(pin, profile.pinHash)) {
    return { error: "Incorrect PIN." };
  }

  return { success: true };
}
