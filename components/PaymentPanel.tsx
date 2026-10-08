"use client";

import { useState, useTransition } from "react";
import { markReceived, logPayment } from "@/actions/payments";
import { Button } from "@/components/ui/Button";
import { TextInput, TextArea } from "@/components/ui/Field";

export function PaymentPanel({ loanId }: { loanId: number }) {
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleMarkReceived() {
    startTransition(async () => {
      await markReceived(loanId, note);
      setNote("");
    });
  }

  function handleLogPayment() {
    startTransition(async () => {
      await logPayment(loanId, amount ? Number(amount) : null, note);
      setNote("");
      setAmount("");
    });
  }

  return (
    <div className="space-y-3">
      <TextInput
        placeholder="Amount paid (₹, optional for partial payment note)"
        type="number"
        min="0"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <TextArea
        placeholder="Note (optional)"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={handleLogPayment}
          disabled={isPending}
        >
          Log partial payment
        </Button>
        <Button type="button" onClick={handleMarkReceived} disabled={isPending}>
          Mark as Received
        </Button>
      </div>
    </div>
  );
}
