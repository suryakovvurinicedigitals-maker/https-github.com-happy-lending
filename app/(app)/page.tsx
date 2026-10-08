import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ReactNode } from "react";
import { Wallet, TrendingUp, Clock, Inbox, ChevronRight, BellRing } from "lucide-react";
import { db } from "@/lib/db";
import { loans, contacts } from "@/lib/db/schema";
import { listDueReminders } from "@/actions/reminders";
import { formatPaise } from "@/lib/currency";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { ReminderQueueItem } from "@/components/ReminderQueueItem";

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

  return (
    <div>
      <PageHeader title="Dashboard" description="An overview of everything you've lent." />

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

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        <div className="space-y-2.5">
          {rows.map((r) => (
            <Link key={r.id} href={`/loans/${r.id}`}>
              <Card
                hover
                className="flex items-center justify-between py-4"
              >
                <div>
                  <p className="font-medium text-foreground">{r.contactName}</p>
                  <p className="text-sm text-muted">
                    {formatPaise(r.principalPaise)} principal &middot; Total{" "}
                    {formatPaise(r.finalTotalPaise)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={r.status} />
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

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="flex items-start justify-between">
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
      </div>
      <div className="text-muted">{icon}</div>
    </Card>
  );
}
