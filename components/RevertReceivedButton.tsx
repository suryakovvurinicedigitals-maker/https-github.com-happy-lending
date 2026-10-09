"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { revertMarkReceived } from "@/actions/payments";
import { Button } from "@/components/ui/Button";

export function RevertReceivedButton({ loanId }: { loanId: number }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleRevert() {
    startTransition(async () => {
      await revertMarkReceived(loanId);
      setConfirming(false);
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Undo &quot;Mark as Received&quot;?</span>
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={isPending}
          onClick={handleRevert}
        >
          {isPending ? "Reverting..." : "Yes, revert"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setConfirming(true)}
      title="Revert mark as received"
    >
      <RotateCcw className="h-4 w-4" />
      Revert
    </Button>
  );
}
