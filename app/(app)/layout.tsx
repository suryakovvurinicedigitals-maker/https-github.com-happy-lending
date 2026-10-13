import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireProfileId } from "@/lib/auth/session";
import { NavBar } from "@/components/NavBar";
import { AppLockGate } from "@/components/AppLockGate";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profileId = await requireProfileId();
  const [profile] = await db
    .select({ name: profiles.name })
    .from(profiles)
    .where(eq(profiles.id, profileId));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavBar profileName={profile?.name ?? ""} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 animate-fade-in">
        <AppLockGate profileName={profile?.name ?? ""}>{children}</AppLockGate>
      </main>
    </div>
  );
}
