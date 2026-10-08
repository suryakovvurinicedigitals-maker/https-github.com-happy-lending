import Link from "next/link";
import { ChevronRight, UserPlus, Phone } from "lucide-react";
import { listContacts } from "@/actions/contacts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function ContactsPage() {
  const allContacts = await listContacts();

  return (
    <div>
      <PageHeader
        title="Contacts"
        description={`${allContacts.length} ${allContacts.length === 1 ? "person" : "people"} you lend to.`}
        actions={
          <Link href="/contacts/new">
            <Button>
              <UserPlus className="h-4 w-4" />
              Add contact
            </Button>
          </Link>
        }
      />

      {allContacts.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="h-5 w-5" />}
          title="No contacts yet"
          description="Add a contact before creating your first loan."
        />
      ) : (
        <div className="space-y-2.5">
          {allContacts.map((c) => (
            <Link key={c.id} href={`/contacts/${c.id}`}>
              <Card hover className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="flex items-center gap-1.5 text-sm text-muted">
                    <Phone className="h-3.5 w-3.5" />
                    {c.phone}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
