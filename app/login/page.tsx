"use client";

import { useActionState } from "react";
import { HandCoins } from "lucide-react";
import { login } from "@/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4">
      <form
        action={formAction}
        className="w-full max-w-sm animate-fade-in rounded-2xl border border-border bg-surface p-8 shadow-sm"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <HandCoins className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Happy Lending
          </h1>
          <p className="mt-1 text-sm text-muted">
            Enter the app password to continue.
          </p>
        </div>

        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Password
        </label>
        <input
          type="password"
          name="password"
          autoFocus
          className="mb-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring/20"
        />

        {state?.error && (
          <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
