"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createContact } from "@/actions/contacts";
import { Card } from "@/components/ui/Card";
import { Field, TextInput, TextArea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

interface ContactPickerApi {
  getProperties(): Promise<string[]>;
  select(
    properties: string[],
    options?: { multiple?: boolean }
  ): Promise<Array<{ name?: string[]; tel?: string[]; email?: string[] }>>;
}

function parseVCard(text: string) {
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const lines = unfolded.split(/\r\n|\n|\r/).map((l) => l.trim()).filter(Boolean);
  let name = "";
  let tel = "";
  let email = "";
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).toUpperCase();
    const value = line.slice(idx + 1).trim();
    if (!name && (key === "FN" || key.startsWith("FN;"))) name = value;
    else if (!tel && (key === "TEL" || key.startsWith("TEL;")))
      tel = value.replace(/\D/g, "");
    else if (!email && (key === "EMAIL" || key.startsWith("EMAIL;")))
      email = value;
  }
  return { name, tel, email };
}

export default function NewContactPage() {
  const [state, formAction, pending] = useActionState(
    createContact,
    undefined
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pickerSupported, setPickerSupported] = useState(false);
  const [pickError, setPickError] = useState("");
  const vcardInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined" && "contacts" in navigator) {
      setPickerSupported(true);
    }
  }, []);

  async function pickFromContacts() {
    setPickError("");
    try {
      const contactsApi = (navigator as unknown as { contacts: ContactPickerApi })
        .contacts;
      const supported = await contactsApi.getProperties();
      const properties = ["name", "tel", "email"].filter((p) =>
        supported.includes(p)
      );
      const [picked] = await contactsApi.select(properties, {
        multiple: false,
      });
      if (!picked) return;
      if (picked.name?.[0]) setName(picked.name[0]);
      if (picked.tel?.[0]) setPhone(picked.tel[0].replace(/\D/g, ""));
      if (picked.email?.[0]) setEmail(picked.email[0]);
    } catch {
      setPickError(
        "Couldn't open your contacts. Your browser may need this page served over HTTPS."
      );
    }
  }

  async function handleVCardFile(file: File) {
    setPickError("");
    try {
      const text = await file.text();
      const parsed = parseVCard(text);
      if (!parsed.name && !parsed.tel && !parsed.email) {
        setPickError("That file didn't look like a contact card.");
        return;
      }
      if (parsed.name) setName(parsed.name);
      if (parsed.tel) setPhone(parsed.tel);
      if (parsed.email) setEmail(parsed.email);
    } catch {
      setPickError("Couldn't read that contact card.");
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Add contact" />
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          {pickerSupported && (
            <Button
              type="button"
              variant="secondary"
              onClick={pickFromContacts}
            >
              Import from phone contacts
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => vcardInputRef.current?.click()}
          >
            Import from contact card (.vcf)
          </Button>
          <input
            ref={vcardInputRef}
            type="file"
            accept=".vcf,text/vcard,text/x-vcard"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleVCardFile(file);
              e.target.value = "";
            }}
          />
        </div>
        <p className="mb-4 text-xs text-muted">
          On iPhone: open the Contacts app, pick a contact, tap{" "}
          <strong className="text-foreground">Share Contact</strong>, then
          save or share the .vcf file and select it above.
        </p>
        {pickError && (
          <p className="mb-4 text-xs text-danger">{pickError}</p>
        )}
        <form action={formAction}>
          <Field label="Name">
            <TextInput
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field
            label="Phone"
            hint="Include country code, e.g. 919876543210 (used for WhatsApp)"
          >
            <TextInput
              name="phone"
              required
              placeholder="919876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Field label="Email (optional)">
            <TextInput
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Address (optional)">
            <TextArea name="address" rows={2} />
          </Field>
          <Field label="Notes (optional)">
            <TextArea name="notes" rows={2} />
          </Field>

          {state?.error && (
            <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? "Saving..." : "Save contact"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
