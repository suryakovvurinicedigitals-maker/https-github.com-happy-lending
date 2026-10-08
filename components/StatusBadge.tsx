export function StatusBadge({ status }: { status: "PENDING" | "RECEIVED" }) {
  const isReceived = status === "RECEIVED";
  return (
    <span className="text-xs font-medium text-muted">
      {isReceived ? "Received" : "Pending"}
    </span>
  );
}
