import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { attachments, loans } from "@/lib/db/schema";
import { readUpload } from "@/lib/uploads";
import { getSession } from "@/lib/auth/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  const profileId = session.profileId;
  if (!profileId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await params;
  const [row] = await db
    .select({ attachment: attachments })
    .from(attachments)
    .innerJoin(loans, eq(attachments.loanId, loans.id))
    .where(and(eq(attachments.id, Number(id)), eq(loans.profileId, profileId)));
  const attachment = row?.attachment;

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
