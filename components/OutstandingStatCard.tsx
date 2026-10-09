"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatPaise } from "@/lib/currency";

export function OutstandingStatCard({
  totalPaise,
  principalPaise,
  interestPaise,
}: {
  totalPaise: number;
  principalPaise: number;
  interestPaise: number;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setShowBreakdown((v) => !v)}
      className="w-full text-left"
      title="Tap to toggle between total and principal/interest breakdown"
    >
      <Card hover className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">
            {showBreakdown ? "Remaining principal + interest" : "Outstanding (pending)"}
          </p>
          {showBreakdown ? (
            <p className="mt-1.5 space-x-1.5 text-lg font-semibold tracking-tight text-foreground">
              <span>{formatPaise(principalPaise)}</span>
              <span className="text-sm font-normal text-muted">principal +</span>
              <span>{formatPaise(interestPaise)}</span>
              <span className="text-sm font-normal text-muted">interest</span>
            </p>
          ) : (
            <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
              {formatPaise(totalPaise)}
            </p>
          )}
        </div>
        <div className="text-muted">
          <Clock className="h-5 w-5" />
        </div>
      </Card>
    </button>
  );
}
