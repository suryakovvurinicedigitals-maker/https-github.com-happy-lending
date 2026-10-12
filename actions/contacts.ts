"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireProfileId } from "@/lib/auth/session";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z
    .string()
    .trim()
    .min(5, "Phone number is required")
    .transform((v) => v.replace(/\D/g, "")),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export async function createContact(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const profileId = await requireProfileId();

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const now = Date.now();
  const [created] = await db
    .insert(contacts)
    .values({
      profileId,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: contacts.id });

  revalidatePath("/contacts");
  redirect(`/contacts/${created.id}`);
}

export async function updateContact(
  id: number,
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const profileId = await requireProfileId();

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const [existing] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.profileId, profileId)));
  if (!existing) {
    return { error: "Contact not found" };
  }

  await db
    .update(contacts)
    .set({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null,
      updatedAt: Date.now(),
    })
    .where(eq(contacts.id, id));

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  redirect(`/contacts/${id}`);
}

export async function listContacts() {
  const profileId = await requireProfileId();
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.profileId, profileId))
    .orderBy(contacts.name);
}

export async function getContact(id: number) {
  const profileId = await requireProfileId();
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.profileId, profileId)));
  return contact ?? null;
}
