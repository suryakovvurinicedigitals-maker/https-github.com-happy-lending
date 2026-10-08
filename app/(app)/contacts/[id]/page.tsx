import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MapPin, StickyNote, ChevronRight, Plus } from "lucide-react";
import { getContact } from "@/actions/contacts";
import { listLoansByContact } from "@/actions/loans";
import { formatPaise } from "@/lib/currency";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contact = await getContact(Number(id));
  if (!contact) notFound();

  const contactLoans = await listLoansByContact(contact.id);

  return (
    <div>
      <PageHeader
        title={contact.name}
        description={contact.phone}
        actions={
          <Link href={`/loans/new?contactId=${contact.id}`}>
            <Button>
              <Plus className="h-4 w-4" />
              New loan
            </Button>
          </Link>
        }
      />

      {(contact.email || contact.address || contact.notes) && (
        <Card className="mb-6 space-y-2">
          {contact.email && (
            <p className="flex items-center gap-2 text-sm text-foreground">
              <Mail className="h-4 w-4 shrink-0 text-muted" />
              {contact.email}
            </p>
          )}
          {contact.address && (
            <p className="flex items-center gap-2 text-sm text-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-muted" />
              {contact.address}
            </p>
          )}
          {contact.notes && (
            <p className="flex items-center gap-2 text-sm text-foreground">
              <StickyNote className="h-4 w-4 shrink-0 text-muted" />
              {contact.notes}
            </p>
          )}
        </Card>
      )}

      <h2 className="mb-3 text-base font-semibold tracking-tight text-foreground">
        Loans
      </h2>
      {contactLoans.length === 0 ? (
        <EmptyState
          title="No loans with this contact yet"
          description="Create a loan to start tracking repayments."
        />
      ) : (
        <div className="space-y-2.5">
          {contactLoans.map((loan) => (
            <Link key={loan.id} href={`/loans/${loan.id}`}>
              <Card hover className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-foreground">
                    {formatPaise(loan.principalPaise)} at{" "}
                    {loan.annualRatePercent}%
                  </p>
                  <p className="text-sm text-muted">
                    Total {formatPaise(loan.finalTotalPaise)} &middot;{" "}
                    {loan.tenureMonths} months
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={loan.status} />
                  <ChevronRight className="h-4 w-4 text-muted" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
