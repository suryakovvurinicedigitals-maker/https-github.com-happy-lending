"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { createTrip } from "@/actions/trips";
import { Field, TextInput, TextArea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function NewTripForm() {
  const [state, formAction, pending] = useActionState(createTrip, undefined);
  const [participantNames, setParticipantNames] = useState<string[]>([""]);

  function updateName(index: number, value: string) {
    setParticipantNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  }

  function addRow() {
    setParticipantNames((prev) => [...prev, ""]);
  }

  function removeRow(index: number) {
    setParticipantNames((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form action={formAction}>
      <Field label="Trip name">
        <TextInput name="name" required placeholder="Goa trip" autoComplete="off" />
      </Field>

      <Field label="Trip date" hint="Optional">
        <TextInput type="date" name="tripDate" />
      </Field>

      <Field label="Notes" hint="Optional">
        <TextArea name="notes" rows={2} />
      </Field>

      <Field label="Participants" hint="The other people splitting this trip with you">
        <div className="space-y-2">
          {participantNames.map((name, i) => (
            <div key={i} className="flex gap-2">
              <TextInput
                name="participantName"
                value={name}
                onChange={(e) => updateName(i, e.target.value)}
                placeholder="Name"
                autoComplete="off"
              />
              {participantNames.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(i)}
                  title="Remove"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={addRow}
        >
          <Plus className="h-4 w-4" />
          Add participant
        </Button>
      </Field>

      {state?.error && (
        <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        variant="secondary"
        disabled={pending}
        className="w-full sm:w-auto"
      >
        {pending ? "Saving..." : "Create trip"}
      </Button>
    </form>
  );
}
