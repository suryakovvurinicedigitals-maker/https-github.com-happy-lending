"use client";

import { useActionState } from "react";
import { uploadScreenshot } from "@/actions/attachments";
import { Button } from "@/components/ui/Button";

export function FileUpload({ loanId }: { loanId: number }) {
  const [state, formAction, pending] = useActionState(
    uploadScreenshot,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="loanId" value={loanId} />
      <input
        type="file"
        name="file"
        accept="image/*"
        required
        className="max-w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-border/60"
      />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Uploading..." : "Upload"}
      </Button>
      {state?.error && <span className="text-sm text-danger">{state.error}</span>}
    </form>
  );
}
