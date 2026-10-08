import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { NewLoanForm } from "@/components/NewLoanForm";
import { listContacts } from "@/actions/contacts";

export default async function NewLoanPage({
  searchParams,
}: {
  searchParams: Promise<{ contactId?: string }>;
}) {
  const { contactId } = await searchParams;
  const contacts = await listContacts();

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="New loan" />

      {contacts.length === 0 ? (
        <EmptyState
          title="You need a contact first"
          description="Add a contact before you can create a loan."
          action={
            <Link href="/contacts/new" className="text-sm font-medium text-accent hover:underline">
              Add a contact →
            </Link>
          }
        />
      ) : (
        <Card>
          <NewLoanForm
            contacts={contacts}
            defaultContactId={contactId ? Number(contactId) : undefined}
          />
        </Card>
      )}
    </div>
  );
}
