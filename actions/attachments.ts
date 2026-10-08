"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attachments } from "@/lib/db/schema";
import { saveUpload } from "@/lib/uploads";
import { compressImage, compressSignature } from "@/lib/image";

export async function listAttachments(loanId: number) {
  return db
    .select()
    .from(attachments)
    .where(eq(attachments.loanId, loanId));
}

export async function uploadScreenshot(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const loanId = Number(formData.get("loanId"));
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a file." };
  }
  if (!Number.isInteger(loanId) || loanId <= 0) {
    return { error: "Invalid loan." };
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const rawMimeType = file.type || "application/octet-stream";
  const { buffer, mimeType, extension } = await compressImage(rawBuffer, rawMimeType);
  const baseName = (file.name || "upload").replace(/\.[^.]+$/, "");
  const fileName = extension ? `${baseName}.${extension}` : file.name || "upload";
  const key = await saveUpload(loanId, fileName, buffer, mimeType);

  await db.insert(attachments).values({
    loanId,
    kind: "SCREENSHOT",
    filePath: key,
    mimeType,
    originalFileName: file.name || null,
    createdAt: Date.now(),
  });

  revalidatePath(`/loans/${loanId}`);
  return {};
}

export async function saveSignature(
  loanId: number,
  dataUrl: string,
  signerRole: "LENDER" | "BORROWER"
) {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid signature image");
  }
  const [, , base64] = match;
  const rawBuffer = Buffer.from(base64, "base64");
  const buffer = await compressSignature(rawBuffer);
  const mimeType = "image/png";

  const key = await saveUpload(
    loanId,
    `signature-${signerRole.toLowerCase()}.png`,
    buffer,
    mimeType
  );

  await db.insert(attachments).values({
    loanId,
    kind: "SIGNATURE",
    signerRole,
    filePath: key,
    mimeType,
    originalFileName: `signature-${signerRole.toLowerCase()}.png`,
    createdAt: Date.now(),
  });

  revalidatePath(`/loans/${loanId}`);
}
