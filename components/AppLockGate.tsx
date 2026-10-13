"use client";

import { useActionState, useEffect } from "react";
import { HandCoins } from "lucide-react";
import { verifyUnlockPin } from "@/actions/lock";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { useAppLock } from "@/lib/hooks/useAppLock";

export function AppLockGate({
  profileName,
  children,
}: {
  profileName: string;
  children: React.ReactNode;
}) {
  const { locked, unlock } = useAppLock();

  if (locked) {
    return <LockScreen profileName={profileName} onUnlock={unlock} />;
  }
  return <>{children}</>;
}

function LockScreen({
  profileName,
  onUnlock,
}: {
  profileName: string;
  onUnlock: () => void;
}) {
  const [state, formAction, pending] = useActionState(verifyUnlockPin, undefined);

  useEffect(() => {
    if (state?.success) {
      onUnlock();
    }
  }, [state, onUnlock]);

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-sm animate-fade-in rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <HandCoins className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Happy Lending
          </h1>
          <p className="mt-1 text-sm text-muted">
            Enter your PIN to continue, {profileName}.
          </p>
        </div>

        <form action={formAction}>
          <input
            type="password"
            inputMode="numeric"
            name="pin"
            autoFocus
            className="mb-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring/20"
          />

          {state?.error && (
            <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Unlocking..." : "Unlock"}
          </Button>
        </form>

        <form action={logout} className="mt-4 text-center">
          <button
            type="submit"
            className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            Not you? Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
