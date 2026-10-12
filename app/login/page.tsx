import { listProfiles } from "@/actions/profiles";
import { ProfilePicker } from "@/components/ProfilePicker";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const profiles = await listProfiles();
  return <ProfilePicker profiles={profiles} />;
}
