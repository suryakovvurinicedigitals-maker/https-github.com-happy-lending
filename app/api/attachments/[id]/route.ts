import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attachments } from "@/lib/db/schema";
import { readUpload } from "@/lib/uploads";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [attachment] = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, Number(id)));

  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await readUpload(attachment.filePath);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
