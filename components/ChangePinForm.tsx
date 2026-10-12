"use client";

import { useActionState } from "react";
import { changePin } from "@/actions/profiles";
import { Button } from "@/components/ui/Button";

export function ChangePinForm() {
  const [state, formAction, pending] = useActionState(changePin, undefined);

  return (
    <form action={formAction}>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        New PIN (4-6 digits)
      </label>
      <input
        type="password"
        inputMode="numeric"
        name="pin"
        autoFocus
        className="mb-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring/20"
      />

      <label className="mb-1.5 block text-sm font-medium text-foreground">
        Confirm new PIN
      </label>
      <input
        type="password"
        inputMode="numeric"
        name="confirmPin"
        className="mb-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring/20"
      />

      {state?.error && (
        <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="mb-4 rounded-lg bg-success-soft px-3 py-2 text-sm text-success">
          PIN updated.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Change PIN"}
      </Button>
    </form>
  );
}
