"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, UserCircle2, Plus } from "lucide-react";
import {
  loginToProfile,
  createProfile,
  resetPinWithRecoveryCode,
} from "@/actions/profiles";
import { Button } from "@/components/ui/Button";
import { RecoveryCodeReveal } from "@/components/RecoveryCodeReveal";
import { seedUnlock } from "@/lib/hooks/useAppLock";

export function ProfilePicker({
  profiles,
}: {
  profiles: { id: number; name: string }[];
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <HandCoins className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Happy Lending
          </h1>
          <p className="mt-1 text-sm text-muted">
            {addingNew
              ? "Create a new profile."
              : selectedId !== null
                ? "Enter your PIN to continue."
                : "Choose a profile to continue."}
          </p>
        </div>

        {addingNew ? (
          <CreateProfileForm onCancel={() => setAddingNew(false)} />
        ) : selectedId !== null ? (
          <PinForm
            profileId={selectedId}
            name={profiles.find((p) => p.id === selectedId)?.name ?? ""}
            onCancel={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => setSelectedId(profile.id)}
                className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:border-accent/40"
              >
                <UserCircle2 className="h-5 w-5 text-muted" />
                {profile.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAddingNew(true)}
              className="flex items-center gap-3 rounded-lg border border-dashed border-border px-3 py-2.5 text-left text-sm font-medium text-muted transition-colors hover:border-accent/40 hover:text-foreground"
            >
              <Plus className="h-5 w-5" />
              Add profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PinForm({
  profileId,
  name,
  onCancel,
}: {
  profileId: number;
  name: string;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(loginToProfile, undefined);
  const [recovering, setRecovering] = useState(false);

  if (recovering) {
    return (
      <RecoverPinForm
        profileId={profileId}
        name={name}
        onCancel={() => setRecovering(false)}
      />
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="profileId" value={profileId} />
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        PIN for {name}
      </label>
      <input
        type="password"
        inputMode="numeric"
        name="pin"
        autoFocus
        className="mb-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring/20"
      />

      <button
        type="button"
        onClick={() => setRecovering(true)}
        className="mb-4 text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
      >
        Forgot PIN?
      </button>

      {state?.error && (
        <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Signing in..." : "Sign in"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          Back
        </Button>
      </div>
    </form>
  );
}

function RecoverPinForm({
  profileId,
  name,
  onCancel,
}: {
  profileId: number;
  name: string;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    resetPinWithRecoveryCode,
    undefined
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="profileId" value={profileId} />
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        Recovery code for {name}
      </label>
      <input
        type="text"
        name="recoveryCode"
        autoFocus
        placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
        className="mb-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring/20"
      />

      <label className="mb-1.5 block text-sm font-medium text-foreground">
        New PIN (4-6 digits)
      </label>
      <input
        type="password"
        inputMode="numeric"
        name="pin"
        className="mb-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring/20"
      />

      <label className="mb-1.5 block text-sm font-medium text-foreground">
        Confirm new PIN
      </label>
      <input
        type="password"
        inputMode="numeric"
        name="confirmPin"
        className="mb-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring/20"
      />

      {state?.error && (
        <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Resetting..." : "Reset PIN"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          Back
        </Button>
      </div>
    </form>
  );
}

function CreateProfileForm({ onCancel }: { onCancel: () => void }) {
  const [state, formAction, pending] = useActionState(createProfile, undefined);
  const router = useRouter();

  if (state?.success && state.recoveryCode) {
    return (
      <RecoveryCodeReveal
        code={state.recoveryCode}
        description="If you ever forget your PIN, this is the only way to get back in."
        continueLabel="Continue to Happy Lending"
        onContinue={() => {
          seedUnlock();
          router.push("/");
        }}
      />
    );
  }

  return (
    <form action={formAction}>
      <label className="mb-1.5 block text-sm font-medium text-foreground">
        Name
      </label>
      <input
        type="text"
        name="name"
        autoFocus
        className="mb-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring/20"
      />

      <label className="mb-1.5 block text-sm font-medium text-foreground">
        PIN (4-6 digits)
      </label>
      <input
        type="password"
        inputMode="numeric"
        name="pin"
        className="mb-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring/20"
      />

      <label className="mb-1.5 block text-sm font-medium text-foreground">
        Confirm PIN
      </label>
      <input
        type="password"
        inputMode="numeric"
        name="confirmPin"
        className="mb-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring/20"
      />

      {state?.error && (
        <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Creating..." : "Create profile"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          Back
        </Button>
      </div>
    </form>
  );
}
