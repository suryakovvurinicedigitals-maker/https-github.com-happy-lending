"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteExpense } from "@/actions/trips";
import { Button } from "@/components/ui/Button";

export function DeleteExpenseButton({
  expenseId,
  tripId,
}: {
  expenseId: number;
  tripId: number;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => deleteExpense(expenseId, tripId))}
      title="Delete expense"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
