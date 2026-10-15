"use client";

import { useActionState } from "react";
import { addExpense } from "@/actions/trips";
import { Field, TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function AddExpenseForm({ tripId }: { tripId: number }) {
  const [state, formAction, pending] = useActionState(
    addExpense.bind(null, tripId),
    undefined
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <Field label="Description">
        <TextInput name="description" required placeholder="Hotel" autoComplete="off" />
      </Field>
      <Field label="Amount (₹)">
        <TextInput
          type="number"
          step="0.01"
          name="amountRupees"
          required
          placeholder="5000"
          autoComplete="off"
        />
      </Field>
      <Field label="Note" hint="Optional">
        <TextInput name="note" placeholder="2 nights" autoComplete="off" />
      </Field>

      {state?.error && (
        <p className="w-full rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Adding..." : "Add expense"}
      </Button>
    </form>
  );
}
