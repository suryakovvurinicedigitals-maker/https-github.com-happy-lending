"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateStartDate } from "@/actions/loans";
import { Button } from "@/components/ui/Button";

export function EditStartDateControl({
  loanId,
  startDate,
}: {
  loanId: number;
  startDate: number;
}) {
  const toInputValue = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(toInputValue(startDate));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateStartDate(loanId, value);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  function handleCancel() {
    setValue(toInputValue(startDate));
    setError(null);
    setEditing(false);
  }

  if (!editing) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="font-medium text-foreground">
          {new Date(startDate).toLocaleDateString("en-IN")}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-muted transition-colors hover:text-foreground"
          title="Edit start date"
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
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-lg border border-border bg-surface px-2 py-1 text-sm text-foreground"
          autoFocus
        />
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
