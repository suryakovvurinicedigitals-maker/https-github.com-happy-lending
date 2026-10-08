import { listAttachments } from "@/actions/attachments";
import { readUpload } from "@/lib/uploads";

export async function loadSignatureDataUri(
  attachments: Awaited<ReturnType<typeof listAttachments>>,
  role: "LENDER" | "BORROWER"
): Promise<string | null> {
  const latest = attachments
    .filter((a) => a.kind === "SIGNATURE" && a.signerRole === role)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  if (!latest) return null;

  const buffer = await readUpload(latest.filePath);
  return `data:${latest.mimeType};base64,${buffer.toString("base64")}`;
}
