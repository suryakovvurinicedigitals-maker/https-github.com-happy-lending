"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Smartphone, Copy, Check } from "lucide-react";
import { buildWaLink } from "@/lib/whatsapp";
import { buildSmsLink } from "@/lib/sms";
import { buildReminderMessage } from "@/lib/messages";
import { markReminderSent } from "@/actions/reminders";
import { formatPaise } from "@/lib/currency";
import { Button } from "@/components/ui/Button";

export function ReminderQueueItem({
  loanId,
  period,
  contact,
  loan,
}: {
  loanId: number;
  period: number;
  contact: { name: string; phone: string };
  loan: {
    principalPaise: number;
    annualRatePercent: number;
    totalInterestPaise: number;
    emiPaise: number;
    tenureMonths: number;
    finalTotalPaise: number;
    startDate: number;
    repaymentType: "EMI" | "INTEREST_ONLY";
  };
}) {
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const message = buildReminderMessage(contact, loan);
  const waHref = buildWaLink(contact.phone, message);
  const smsHref = buildSmsLink(contact.phone, message);

  function handleSend() {
    setSent(true);
    markReminderSent(loanId, period).catch(() => setSent(false));
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      handleSend();
    } catch {
      // Clipboard API unavailable — nothing we can do silently.
    }
  }

  if (sent) {
    return (
      <div className="flex items-center justify-between gap-3 py-2.5 text-sm text-muted">
        <span>Reminder sent to {contact.name}.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <Link href={`/loans/${loanId}`} className="min-w-0">
        <p className="truncate font-medium text-foreground hover:underline">
          {contact.name}
        </p>
        <p className="text-xs text-muted">
          {loan.repaymentType === "INTEREST_ONLY" ? "Interest" : "EMI"}{" "}
          {formatPaise(loan.emiPaise)} due
        </p>
      </Link>
      <div className="flex shrink-0 gap-2">
        <a href={waHref} target="_blank" rel="noopener noreferrer" onClick={handleSend}>
          <Button type="button" variant="secondary" size="sm">
            <MessageCircle className="h-4 w-4" />
          </Button>
        </a>
        <a href={smsHref} onClick={handleSend}>
          <Button type="button" variant="secondary" size="sm">
            <Smartphone className="h-4 w-4" />
          </Button>
        </a>
        <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
