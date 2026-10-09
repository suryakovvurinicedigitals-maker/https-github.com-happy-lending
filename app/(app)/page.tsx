import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ReactNode } from "react";
import {
  Wallet,
  TrendingUp,
  Clock,
  Inbox,
  BellRing,
  FileDown,
  AlertTriangle,
} from "lucide-react";
import { db } from "@/lib/db";
import { loans, contacts, installments } from "@/lib/db/schema";
import { listDueReminders } from "@/actions/reminders";
import { formatPaise } from "@/lib/currency";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReminderQueueItem } from "@/components/ReminderQueueItem";
import { LoanListFilter } from "@/components/LoanListFilter";

export default async function DashboardPage() {
  const rows = await db
    .select({
      id: loans.id,
      principalPaise: loans.principalPaise,
      finalTotalPaise: loans.finalTotalPaise,
      status: loans.status,
      contactName: contacts.name,
    })
    .from(loans)
    .innerJoin(contacts, eq(loans.contactId, contacts.id))
    .orderBy(desc(loans.createdAt));

  const pending = rows.filter((r) => r.status === "PENDING");
  const totalOutstandingPaise = pending.reduce(
    (sum, r) => sum + r.finalTotalPaise,
    0
  );
  const totalLentPaise = rows.reduce((sum, r) => sum + r.principalPaise, 0);
  const dueReminders = await listDueReminders();

  const allInstallments = await db
    .select({
      loanId: installments.loanId,
      amountPaise: installments.amountPaise,
      amountPaidPaise: installments.amountPaidPaise,
      status: installments.status,
      dueDate: installments.dueDate,
    })
    .from(installments);

  // eslint-disable-next-line react-hooks/purity -- overdue status must reflect the current wall-clock time, not a memoized render
  const now = Date.now();
  const overdueLoanIds = new Set<number>();
  let overdueAmountPaise = 0;
  for (const i of allInstallments) {
    if (i.status !== "PAID" && i.dueDate < now) {
      overdueLoanIds.add(i.loanId);
      overdueAmountPaise += i.amountPaise - (i.amountPaidPaise ?? 0);
    }
  }

  const loanRows = rows.map((r) => ({ ...r, overdue: overdueLoanIds.has(r.id) }));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="An overview of everything you've lent."
        actions={
          <a
            href="/api/export"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-background"
          >
            <FileDown className="h-4 w-4" />
            Export CSV
          </a>
        }
      />

      {dueReminders.length > 0 && (
        <Card className="mb-6">
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
            <BellRing className="h-4 w-4 text-muted" />
            Reminders due ({dueReminders.length})
          </div>
          <div className="divide-y divide-border">
            {dueReminders.map(({ reminder, loan, contact, period }) => (
              <ReminderQueueItem
                key={reminder.id}
                loanId={loan.id}
                period={period}
                contact={contact}
                loan={loan}
              />
            ))}
          </div>
        </Card>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          label="Total loans"
          value={String(rows.length)}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Total principal lent"
          value={formatPaise(totalLentPaise)}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Outstanding (pending)"
          value={formatPaise(totalOutstandingPaise)}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label={`Overdue (${overdueLoanIds.size})`}
          value={formatPaise(overdueAmountPaise)}
          tone={overdueLoanIds.size > 0 ? "danger" : undefined}
        />
      </div>

      <h2 className="mb-3 text-base font-semibold tracking-tight text-foreground">
        Recent loans
      </h2>
      {rows.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title="No loans yet"
          description="Create your first loan to start tracking repayments."
          action={
            <Link
              href="/loans/new"
              className="text-sm font-medium text-accent hover:underline"
            >
              Create your first loan →
            </Link>
          }
        />
      ) : (
        <LoanListFilter loans={loanRows} />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "danger";
}) {
  return (
    <Card className="flex items-start justify-between">
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p
          className={`mt-1.5 text-2xl font-semibold tracking-tight ${
            tone === "danger" ? "text-danger" : "text-foreground"
          }`}
        >
          {value}
        </p>
      </div>
      <div className={tone === "danger" ? "text-danger" : "text-muted"}>{icon}</div>
    </Card>
  );
}
