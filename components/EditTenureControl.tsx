"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateTenure } from "@/actions/loans";
import { Button } from "@/components/ui/Button";

export function EditTenureControl({
  loanId,
  tenureMonths,
}: {
  loanId: number;
  tenureMonths: number;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(tenureMonths));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateTenure(loanId, Number(value));
      if (result?.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  function handleCancel() {
    setValue(String(tenureMonths));
    setError(null);
    setEditing(false);
  }

  if (!editing) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="font-medium text-foreground">{tenureMonths} months</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-muted transition-colors hover:text-foreground"
          title="Edit tenure"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <input
          type="number"
          min="1"
          step="1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-20 rounded-lg border border-border bg-surface px-2 py-1 text-right text-sm text-foreground"
          autoFocus
        />
        <span className="text-sm text-muted">months</span>
        <Button type="button" size="sm" disabled={isPending} onClick={handleSave}>
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={handleCancel}
        >
          Cancel
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
