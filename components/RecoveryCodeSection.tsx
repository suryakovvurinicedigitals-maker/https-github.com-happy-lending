"use client";

import { useActionState, useState } from "react";
import { generateNewRecoveryCode } from "@/actions/profiles";
import { Button } from "@/components/ui/Button";
import { RecoveryCodeReveal } from "@/components/RecoveryCodeReveal";

export function RecoveryCodeSection({ hasCode }: { hasCode: boolean }) {
  const [state, formAction, pending] = useActionState(
    generateNewRecoveryCode,
    undefined
  );
  const [open, setOpen] = useState(false);

  if (state?.success && state.recoveryCode) {
    return (
      <RecoveryCodeReveal
        code={state.recoveryCode}
        description="This replaces any previous recovery code."
        continueLabel="Done"
        onContinue={() => {
          setOpen(false);
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Recovery code:{" "}
        <span className="font-medium text-foreground">
          {hasCode ? "set" : "not set"}
        </span>
        . Use it to reset your PIN if you ever forget it.
      </p>

      {open ? (
        <form action={formAction}>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Current PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            name="pin"
            autoFocus
            className="mb-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring/20"
          />

          {state?.error && (
            <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Generating..." : "Confirm"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          {hasCode ? "Regenerate code" : "Generate code"}
        </Button>
      )}
    </div>
  );
}
