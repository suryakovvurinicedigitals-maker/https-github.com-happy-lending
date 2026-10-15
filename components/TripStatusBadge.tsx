export function TripStatusBadge({ settled }: { settled: boolean }) {
  return (
    <span
      className={`text-xs font-medium ${settled ? "text-success" : "text-muted"}`}
    >
      {settled ? "Settled" : "Open"}
    </span>
  );
}
