"use client";

import { useActionState } from "react";
import { addParticipant } from "@/actions/trips";
import { Field, TextInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function AddParticipantForm({ tripId }: { tripId: number }) {
  const [state, formAction, pending] = useActionState(
    addParticipant.bind(null, tripId),
    undefined
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <Field label="Name">
        <TextInput name="name" required placeholder="Name" autoComplete="off" />
      </Field>
      <Field label="Phone" hint="Optional — enables WhatsApp/SMS nudges">
        <TextInput name="phone" placeholder="98765 43210" autoComplete="off" />
      </Field>

      {state?.error && (
        <p className="w-full rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Adding..." : "Add participant"}
      </Button>
    </form>
  );
}
