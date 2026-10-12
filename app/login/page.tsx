import { listProfiles } from "@/actions/profiles";
import { ProfilePicker } from "@/components/ProfilePicker";

export default async function LoginPage() {
  const profiles = await listProfiles();
  return <ProfilePicker profiles={profiles} />;
}
