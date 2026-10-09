"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteLoan } from "@/actions/loans";
import { Button } from "@/components/ui/Button";

export function DeleteLoanButton({ loanId }: { loanId: number }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(() => {
      deleteLoan(loanId);
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Delete this loan and all its data?</span>
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={isPending}
          onClick={handleDelete}
        >
          {isPending ? "Deleting..." : "Yes, delete"}
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
      title="Delete loan"
    >
      <Trash2 className="h-4 w-4" />
      Delete
    </Button>
  );
}
