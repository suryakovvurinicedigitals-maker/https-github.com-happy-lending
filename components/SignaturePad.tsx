"use client";

import { useRef, useState, useTransition } from "react";
import SignatureCanvas from "react-signature-canvas";
import { saveSignature } from "@/actions/attachments";
import { Button } from "@/components/ui/Button";

export function SignaturePad({
  loanId,
  role,
}: {
  loanId: number;
  role: "LENDER" | "BORROWER";
}) {
  const padRef = useRef<SignatureCanvas>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleClear() {
    padRef.current?.clear();
    setSaved(false);
    setError(null);
  }

  function handleSave() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      setError("Please draw a signature first.");
      return;
    }
    const dataUrl = pad.getTrimmedCanvas().toDataURL("image/png");
    setError(null);
    startTransition(async () => {
      await saveSignature(loanId, dataUrl, role);
      setSaved(true);
      pad.clear();
    });
  }

  return (
    <div>
      <div className="mb-2 w-full rounded-lg border border-border bg-white">
        <SignatureCanvas
          ref={padRef}
          penColor="black"
          canvasProps={{ className: "w-full h-32" }}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleClear}>
          Clear
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save signature"}
        </Button>
        {saved && (
          <span className="text-sm text-success">Signature saved.</span>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
