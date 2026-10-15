import Link from "next/link";
import { ChevronRight, Plane, PlusCircle } from "lucide-react";
import { listTrips } from "@/actions/trips";
import { formatPaise } from "@/lib/currency";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { TripStatusBadge } from "@/components/TripStatusBadge";

export default async function TripsPage() {
  const tripRows = await listTrips();

  return (
    <div>
      <PageHeader
        title="Trips"
        description={`${tripRows.length} ${tripRows.length === 1 ? "trip" : "trips"} you've fronted.`}
        actions={
          <Link href="/trips/new">
            <Button>
              <PlusCircle className="h-4 w-4" />
              New trip
            </Button>
          </Link>
        }
      />

      {tripRows.length === 0 ? (
        <EmptyState
          icon={<Plane className="h-5 w-5" />}
          title="No trips yet"
          description="Create a trip to start logging expenses and splitting them with the group."
        />
      ) : (
        <div className="space-y-2.5">
          {tripRows.map(({ trip, totalPaise, settled }) => (
            <Link key={trip.id} href={`/trips/${trip.id}`}>
              <Card hover className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-foreground">{trip.name}</p>
                  <p className="text-sm text-muted">
                    {trip.tripDate
                      ? new Date(trip.tripDate).toLocaleDateString("en-IN")
                      : "No date set"}
                    {" · "}
                    {formatPaise(totalPaise)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <TripStatusBadge settled={settled} />
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
