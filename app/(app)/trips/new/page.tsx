import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { NewTripForm } from "@/components/NewTripForm";

export default function NewTripPage() {
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="New trip" />
      <Card>
        <NewTripForm />
      </Card>
    </div>
  );
}
