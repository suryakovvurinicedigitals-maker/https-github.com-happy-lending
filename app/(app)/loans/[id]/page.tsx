import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, ImagePlus, PenLine, ReceiptText } from "lucide-react";
import { getLoan } from "@/actions/loans";
import { listAttachments } from "@/actions/attachments";
import { getReminder } from "@/actions/reminders";
import { formatPaise } from "@/lib/currency";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmationButtons } from "@/components/ConfirmationButtons";
import { ClosureButtons } from "@/components/ClosureButtons";
import { NewLoanBanner } from "@/components/NewLoanBanner";
import { ReminderButtons } from "@/components/ReminderButtons";
import { ReminderSettings } from "@/components/ReminderSettings";
import { FileUpload } from "@/components/FileUpload";
import { SignaturePad } from "@/components/SignaturePad";
import { PaymentPanel } from "@/components/PaymentPanel";
import { RepaymentSchedule } from "@/components/RepaymentSchedule";
import { DeleteLoanButton } from "@/components/DeleteLoanButton";
import { EditTenureControl } from "@/components/EditTenureControl";
import { EditRateControl } from "@/components/EditRateControl";

export default async function LoanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const loanId = Number(id);
  const data = await getLoan(loanId);
  if (!data) notFound();

  const { loan, contact, paymentLogs, installments } = data;
  const attachments = await listAttachments(loanId);
  const screenshots = attachments.filter((a) => a.kind === "SCREENSHOT");
  const lenderSignature = latestByRole(attachments, "LENDER");
  const borrowerSignature = latestByRole(attachments, "BORROWER");
  const reminder = await getReminder(loanId);
  const { created } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground break-words">
            <Link href={`/contacts/${contact.id}`} className="hover:text-accent hover:underline">
              {contact.name}
            </Link>
          </h1>
          <p className="text-sm text-muted">Loan #{loan.id}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={loan.status} />
          <DeleteLoanButton loanId={loan.id} />
        </div>
      </div>

      {created === "1" && <NewLoanBanner contact={contact} loan={loan} />}

      <Card>
        <SectionTitle icon={<ReceiptText className="h-4 w-4" />}>Summary</SectionTitle>
        <div className="divide-y divide-border text-sm">
          <Row label="Principal" value={formatPaise(loan.principalPaise)} />
          <div className="flex flex-wrap items-center justify-between gap-y-1 py-2 text-sm">
            <span className="text-muted">Interest</span>
            {loan.status === "PENDING" ? (
              <span className="flex items-center gap-2">
                <EditRateControl loanId={loan.id} annualRatePercent={loan.annualRatePercent} />
                <span className="font-medium text-foreground">
                  · {formatPaise(loan.totalInterestPaise)}
                </span>
              </span>
            ) : (
              <span className="font-medium text-foreground">
                {loan.annualRatePercent}% · {formatPaise(loan.totalInterestPaise)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-y-1 py-2 text-sm">
            <span className="text-muted">Tenure</span>
            {loan.status === "PENDING" ? (
              <EditTenureControl loanId={loan.id} tenureMonths={loan.tenureMonths} />
            ) : (
              <span className="font-medium text-foreground">{loan.tenureMonths} months</span>
            )}
          </div>
          {loan.repaymentType === "INTEREST_ONLY" ? (
            <>
              <Row
                label="Monthly interest"
                value={`${formatPaise(loan.emiPaise)} / month`}
              />
              <Row
                label="Final month payment"
                value={formatPaise(loan.emiPaise + loan.principalPaise)}
              />
            </>
          ) : (
            <Row label="EMI" value={`${formatPaise(loan.emiPaise)} / month`} />
          )}
          <Row
            label="Final total"
            value={formatPaise(loan.finalTotalPaise)}
            emphasis
          />
          <Row
            label="Start date"
            value={new Date(loan.startDate).toLocaleDateString("en-IN")}
          />
          {loan.closedAt && (
            <Row
              label="Closed date"
              value={new Date(loan.closedAt).toLocaleDateString("en-IN")}
            />
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <ConfirmationButtons contact={contact} loan={loan} />
          <a
            href={`/api/agreement/${loan.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
          >
            <FileDown className="h-4 w-4" />
            Agreement PDF
          </a>
        </div>
      </Card>

      <Card>
        <SectionTitle icon={<ImagePlus className="h-4 w-4" />}>Proof of transaction</SectionTitle>

        <p className="mb-2 text-sm font-medium text-foreground">
          Screenshot / media
        </p>
        {screenshots.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {screenshots.map((s) => (
              <img
                key={s.id}
                src={`/api/attachments/${s.id}`}
                alt={s.originalFileName ?? "screenshot"}
                className="h-24 w-24 rounded-lg border border-border object-cover"
              />
            ))}
          </div>
        )}
        <FileUpload loanId={loan.id} />

        <div className="mt-6 mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <PenLine className="h-4 w-4 text-muted" />
          Digital signatures
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <SignatureBlock
            label="Lender (you)"
            signature={lenderSignature}
          >
            <SignaturePad loanId={loan.id} role="LENDER" />
          </SignatureBlock>
          <SignatureBlock
            label={`Borrower (${contact.name})`}
            signature={borrowerSignature}
          >
            <SignaturePad loanId={loan.id} role="BORROWER" />
          </SignatureBlock>
        </div>
      </Card>

      <Card>
        <SectionTitle>Payment status</SectionTitle>
        {loan.status === "PENDING" ? (
          <>
            <ReminderButtons contact={contact} loan={loan} />
            <PaymentPanel loanId={loan.id} />
          </>
        ) : (
          <div className="rounded-lg bg-success-soft px-3 py-2">
            <p className="mb-2 text-sm text-success">This loan has been fully received.</p>
            <div className="flex flex-wrap items-center gap-2">
              <ClosureButtons contact={contact} loan={loan} />
              <a
                href={`/api/closure/${loan.id}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-background"
              >
                <FileDown className="h-4 w-4" />
                Download closure PDF
              </a>
            </div>
          </div>
        )}

        {paymentLogs.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
            {paymentLogs.map((log) => (
              <div key={log.id} className="flex justify-between text-muted">
                <span>
                  {new Date(log.loggedAt).toLocaleDateString("en-IN")} — {log.status}
                  {log.note ? ` — ${log.note}` : ""}
                </span>
                {log.amountPaidPaise && (
                  <span className="font-medium text-foreground">
                    {formatPaise(log.amountPaidPaise)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {installments.length > 0 && (
        <Card>
          <SectionTitle>Repayment schedule</SectionTitle>
          <RepaymentSchedule loanId={loan.id} contact={contact} installments={installments} />
        </Card>
      )}

      {loan.status === "PENDING" && (
        <Card>
          <ReminderSettings
            loanId={loan.id}
            defaultMonths={loan.tenureMonths}
            reminder={reminder}
          />
        </Card>
      )}
    </div>
  );
}

function latestByRole(
  attachments: {
    id: number;
    kind: string;
    signerRole: string | null;
    createdAt: number;
  }[],
  role: "LENDER" | "BORROWER"
) {
  return attachments
    .filter((a) => a.kind === "SIGNATURE" && a.signerRole === role)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
}

function SignatureBlock({
  label,
  signature,
  children,
}: {
  label: string;
  signature?: { id: number };
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted">{label}</p>
      {signature && (
        <img
          src={`/api/attachments/${signature.id}`}
          alt={`${label} signature`}
          className="mb-2 h-20 w-full rounded-lg border border-border bg-white object-contain"
        />
      )}
      {children}
    </div>
  );
}

function SectionTitle({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
      {icon && <span className="text-muted">{icon}</span>}
      {children}
    </h2>
  );
}

function Row({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex justify-between py-2 first:pt-0 last:pb-0">
      <span className="text-muted">{label}</span>
      <span
        className={
          emphasis ? "font-semibold text-accent" : "font-medium text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}
