import { notFound } from "next/navigation";
import { ReceiptText, Users } from "lucide-react";
import { getTrip } from "@/actions/trips";
import { computeShares, paymentStatus } from "@/lib/tripSplit";
import { formatPaise } from "@/lib/currency";
import { Card } from "@/components/ui/Card";
import { TripStatusBadge } from "@/components/TripStatusBadge";
import { DeleteTripButton } from "@/components/DeleteTripButton";
import { DeleteExpenseButton } from "@/components/DeleteExpenseButton";
import { AddExpenseForm } from "@/components/AddExpenseForm";
import { AddParticipantForm } from "@/components/AddParticipantForm";
import { ParticipantShareRow } from "@/components/ParticipantShareRow";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tripId = Number(id);
  const data = await getTrip(tripId);
  if (!data) notFound();

  const { trip, expenses, participants } = data;
  const totalPaise = expenses.reduce((sum, e) => sum + e.amountPaise, 0);
  const shares = computeShares(totalPaise, participants);
  const settled =
    participants.length > 0 &&
    participants.every(
      (p) => paymentStatus(shares.get(p.id) ?? 0, p.amountPaidPaise) === "PAID"
    );
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground break-words">
            {trip.name}
          </h1>
          <p className="text-sm text-muted">
            {trip.tripDate
              ? new Date(trip.tripDate).toLocaleDateString("en-IN")
              : "No date set"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TripStatusBadge settled={settled} />
          <DeleteTripButton tripId={trip.id} />
        </div>
      </div>

      {trip.notes && (
        <Card>
          <p className="text-sm text-muted">{trip.notes}</p>
        </Card>
      )}

      <Card>
        <SectionTitle icon={<ReceiptText className="h-4 w-4" />}>Expenses</SectionTitle>
        {expenses.length > 0 && (
          <div className="mb-4 divide-y divide-border text-sm">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{e.description}</p>
                  {e.note && <p className="text-xs text-muted">{e.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {formatPaise(e.amountPaise)}
                  </span>
                  <DeleteExpenseButton expenseId={e.id} tripId={trip.id} />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span className="text-sm font-semibold text-accent">
            {formatPaise(totalPaise)}
          </span>
        </div>
        <div className="mt-4">
          <AddExpenseForm tripId={trip.id} />
        </div>
      </Card>

      <Card>
        <SectionTitle icon={<Users className="h-4 w-4" />}>Split</SectionTitle>

        {participants.length > 0 && (
          <div className="mb-2">
            {participants.map((p) => (
              <ParticipantShareRow
                key={p.id}
                tripId={trip.id}
                trip={trip}
                participant={p}
                sharePaise={shares.get(p.id) ?? 0}
              />
            ))}
          </div>
        )}

        <div className="mt-4">
          <AddParticipantForm tripId={trip.id} />
        </div>
      </Card>
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
