"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Smartphone, Trash2, RotateCcw, CheckCircle2 } from "lucide-react";
import {
  deleteParticipant,
  setParticipantShare,
  setParticipantPaid,
  setParticipantFullyPaid,
} from "@/actions/trips";
import { buildWaLink } from "@/lib/whatsapp";
import { buildSmsLink } from "@/lib/sms";
import { buildTripShareMessage } from "@/lib/messages";
import { paiseToRupees, formatPaise } from "@/lib/currency";
import { paymentStatus } from "@/lib/tripSplit";
import { Button } from "@/components/ui/Button";
import { CopyMessageButton } from "@/components/CopyMessageButton";

export function ParticipantShareRow({
  tripId,
  trip,
  participant,
  sharePaise,
}: {
  tripId: number;
  trip: { name: string };
  participant: {
    id: number;
    name: string;
    phone: string | null;
    customSharePaise: number | null;
    amountPaidPaise: number;
  };
  sharePaise: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [paidError, setPaidError] = useState<string | null>(null);

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    setError(null);
    startTransition(async () => {
      const result = await setParticipantShare(participant.id, tripId, e.target.value);
      if (result?.error) setError(result.error);
    });
  }

  function handleResetToAuto() {
    setError(null);
    startTransition(async () => {
      await setParticipantShare(participant.id, tripId, "");
    });
  }

  function handlePaidBlur(e: React.FocusEvent<HTMLInputElement>) {
    setPaidError(null);
    startTransition(async () => {
      const result = await setParticipantPaid(participant.id, tripId, e.target.value);
      if (result?.error) setPaidError(result.error);
    });
  }

  function handleMarkFullyPaid() {
    setPaidError(null);
    startTransition(async () => {
      await setParticipantFullyPaid(participant.id, tripId);
    });
  }

  function handleDelete() {
    startTransition(() => {
      deleteParticipant(participant.id, tripId);
    });
  }

  const status = paymentStatus(sharePaise, participant.amountPaidPaise);
  const message = buildTripShareMessage(participant, trip, sharePaise, participant.amountPaidPaise);
  const waHref = participant.phone ? buildWaLink(participant.phone, message) : null;
  const smsHref = participant.phone ? buildSmsLink(participant.phone, message) : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-3 last:border-0">
      <div className="min-w-0">
        <p className="font-medium text-foreground">{participant.name}</p>
        {participant.phone && <p className="text-xs text-muted">{participant.phone}</p>}
        <p
          className={`text-xs font-medium ${
            status === "PAID"
              ? "text-success"
              : status === "PARTIAL"
                ? "text-warning"
                : "text-muted"
          }`}
        >
          {status === "PAID"
            ? "Paid"
            : status === "PARTIAL"
              ? `Partial — ${formatPaise(sharePaise - participant.amountPaidPaise)} remaining`
              : "Pending"}
        </p>
        {error && <p className="text-xs text-danger">{error}</p>}
        {paidError && <p className="text-xs text-danger">{paidError}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted">Share ₹</span>
          <input
            key={`${sharePaise}-${participant.customSharePaise}`}
            type="number"
            step="0.01"
            defaultValue={paiseToRupees(sharePaise)}
            onBlur={handleBlur}
            disabled={isPending}
            className="w-24 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-foreground"
          />
          {participant.customSharePaise != null && (
            <button
              type="button"
              title="Reset to auto split"
              onClick={handleResetToAuto}
              disabled={isPending}
              className="text-muted transition-colors hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-sm text-muted">Paid ₹</span>
          <input
            key={`${sharePaise}-${participant.amountPaidPaise}`}
            type="number"
            step="0.01"
            defaultValue={paiseToRupees(participant.amountPaidPaise)}
            onBlur={handlePaidBlur}
            disabled={isPending}
            className="w-24 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-foreground"
          />
          {status !== "PAID" && (
            <button
              type="button"
              title="Mark fully paid"
              onClick={handleMarkFullyPaid}
              disabled={isPending}
              className="text-muted transition-colors hover:text-success"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {waHref && (
          <a href={waHref} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" type="button" size="sm" title="Send via WhatsApp">
              <MessageCircle className="h-4 w-4" />
            </Button>
          </a>
        )}
        {smsHref && (
          <a href={smsHref}>
            <Button variant="secondary" type="button" size="sm" title="Send via SMS">
              <Smartphone className="h-4 w-4" />
            </Button>
          </a>
        )}
        <CopyMessageButton message={message} />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={handleDelete}
          title="Remove participant"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
