import { notFound } from "next/navigation";
import { getContact } from "@/actions/contacts";
import { PageHeader } from "@/components/ui/PageHeader";
import { EditContactForm } from "@/components/EditContactForm";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contact = await getContact(Number(id));
  if (!contact) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Edit contact" />
      <EditContactForm contact={contact} />
    </div>
  );
}
