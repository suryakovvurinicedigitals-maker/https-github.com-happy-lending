import { createElement } from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getLoan } from "@/actions/loans";
import { listAttachments } from "@/actions/attachments";
import { loadSignatureDataUri } from "@/lib/pdf/signatures";
import { AgreementDocument } from "@/lib/pdf/AgreementDocument";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ loanId: string }> }
) {
  const { loanId } = await params;
  const data = await getLoan(Number(loanId));

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const attachments = await listAttachments(Number(loanId));
  const [lenderSignatureDataUri, borrowerSignatureDataUri] = await Promise.all([
    loadSignatureDataUri(attachments, "LENDER"),
    loadSignatureDataUri(attachments, "BORROWER"),
  ]);

  const element = createElement(AgreementDocument, {
    loan: data.loan,
    contact: data.contact,
    lenderSignatureDataUri,
    borrowerSignatureDataUri,
  }) as unknown as Parameters<typeof renderToBuffer>[0];

  const buffer = await renderToBuffer(element);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="agreement-${loanId}.pdf"`,
    },
  });
}
