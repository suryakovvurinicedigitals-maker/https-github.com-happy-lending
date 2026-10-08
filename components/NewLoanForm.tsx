"use client";

import { useActionState } from "react";
import { createLoan } from "@/actions/loans";
import { Field, TextInput, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { EmiFields } from "@/components/EmiFields";

interface ContactOption {
  id: number;
  name: string;
}

export function NewLoanForm({
  contacts,
  defaultContactId,
}: {
  contacts: ContactOption[];
  defaultContactId?: number;
}) {
  const [state, formAction, pending] = useActionState(createLoan, undefined);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction}>
      <Field label="Contact">
        <Select
          name="contactId"
          required
          defaultValue={defaultContactId ?? ""}
        >
          <option value="" disabled>
            Select a contact
          </option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <EmiFields />

      <Field label="Start date">
        <TextInput name="startDate" type="date" defaultValue={today} required />
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
        {pending ? "Saving..." : "Create loan"}
      </Button>
    </form>
  );
}
