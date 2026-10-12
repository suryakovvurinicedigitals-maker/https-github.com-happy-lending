"use client";

import { useActionState } from "react";
import { updateContact } from "@/actions/contacts";
import { Card } from "@/components/ui/Card";
import { Field, TextInput, TextArea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function EditContactForm({
  contact,
}: {
  contact: {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    notes: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateContact.bind(null, contact.id),
    undefined
  );

  return (
    <Card>
      <form action={formAction}>
        <Field label="Name">
          <TextInput name="name" required defaultValue={contact.name} />
        </Field>
        <Field
          label="Phone"
          hint="Include country code, e.g. 919876543210 (used for WhatsApp)"
        >
          <TextInput
            name="phone"
            required
            placeholder="919876543210"
            defaultValue={contact.phone}
          />
        </Field>
        <Field label="Email (optional)">
          <TextInput
            name="email"
            type="email"
            defaultValue={contact.email ?? ""}
          />
        </Field>
        <Field label="Address (optional)">
          <TextArea name="address" rows={2} defaultValue={contact.address ?? ""} />
        </Field>
        <Field label="Notes (optional)">
          <TextArea name="notes" rows={2} defaultValue={contact.notes ?? ""} />
        </Field>

        {state?.error && (
          <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </Card>
  );
}
