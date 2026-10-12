"use client";

import { useActionState, useState } from "react";
import { deleteProfile } from "@/actions/profiles";
import { Button } from "@/components/ui/Button";

export function DeleteProfileForm() {
  const [state, formAction, pending] = useActionState(deleteProfile, undefined);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <p className="mb-4 text-sm text-danger">
        Permanently deletes this profile and everything it owns: all
        contacts, loans, payment history, and attachments. This cannot be
        undone.
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
            <Button type="submit" variant="danger" disabled={pending} className="flex-1">
              {pending ? "Deleting..." : "Permanently delete profile"}
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
        <Button type="button" variant="danger" onClick={() => setOpen(true)}>
          Delete profile
        </Button>
      )}
    </div>
  );
}
