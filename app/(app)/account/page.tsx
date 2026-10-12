import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ChangePinForm } from "@/components/ChangePinForm";
import { RecoveryCodeSection } from "@/components/RecoveryCodeSection";
import { DeleteProfileForm } from "@/components/DeleteProfileForm";
import { hasRecoveryCode } from "@/actions/profiles";

export default async function AccountPage() {
  const hasCode = await hasRecoveryCode();

  return (
    <div>
      <PageHeader title="Account" description="Manage your profile's PIN." />
      <div className="flex max-w-sm flex-col gap-6">
        <Card>
          <ChangePinForm />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Recovery code
          </h2>
          <RecoveryCodeSection hasCode={hasCode} />
        </Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-danger">
            Danger zone
          </h2>
          <DeleteProfileForm />
        </Card>
      </div>
    </div>
  );
}
