"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function RecoveryCodeReveal({
  code,
  description,
  onContinue,
  continueLabel = "Continue",
}: {
  code: string;
  description: string;
  onContinue: () => void;
  continueLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access denied; user can still select the text manually
    }
  }

  return (
    <div>
      <p className="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
        Save this recovery code now. {description} It will not be shown
        again.
      </p>
      <div className="mb-4 rounded-lg border border-border bg-background px-3 py-3 text-center font-mono text-base tracking-wide text-foreground">
        {code}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={copy} className="flex-1">
          {copied ? "Copied!" : "Copy code"}
        </Button>
        <Button type="button" onClick={onContinue} className="flex-1">
          {continueLabel}
        </Button>
      </div>
    </div>
  );
}
