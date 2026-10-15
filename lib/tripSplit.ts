export interface ShareInput {
  id: number;
  customSharePaise: number | null;
}

// The total is split only among the listed participants — the trip
// organizer (current user) fronts the money but doesn't take a share.
export function computeShares(
  totalPaise: number,
  participants: ShareInput[]
): Map<number, number> {
  const customs = participants.filter((p) => p.customSharePaise != null);
  const autos = participants.filter((p) => p.customSharePaise == null);
  const customTotal = customs.reduce((sum, p) => sum + p.customSharePaise!, 0);
  const remaining = Math.max(totalPaise - customTotal, 0);
  const autoCount = autos.length;
  const base = autoCount > 0 ? Math.floor(remaining / autoCount) : 0;
  const leftover = autoCount > 0 ? remaining - base * autoCount : 0;

  const shares = new Map<number, number>();
  customs.forEach((p) => shares.set(p.id, p.customSharePaise!));
  autos.forEach((p, i) => shares.set(p.id, base + (i < leftover ? 1 : 0)));
  return shares;
}

export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID";

export function paymentStatus(sharePaise: number, amountPaidPaise: number): PaymentStatus {
  if (amountPaidPaise <= 0) return "PENDING";
  if (amountPaidPaise < sharePaise) return "PARTIAL";
  return "PAID";
}
