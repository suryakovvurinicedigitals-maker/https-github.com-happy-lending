"use client";

import { MessageCircle, Smartphone } from "lucide-react";
import { buildWaLink } from "@/lib/whatsapp";
import { buildSmsLink } from "@/lib/sms";
import { buildClosureMessage } from "@/lib/messages";
import { Button } from "@/components/ui/Button";
import { CopyMessageButton } from "@/components/CopyMessageButton";

export function ClosureButtons({
  contact,
  loan,
}: {
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
  const message = buildClosureMessage(contact, loan);
  const waHref = buildWaLink(contact.phone, message);
  const smsHref = buildSmsLink(contact.phone, message);

  return (
    <div className="flex flex-wrap gap-2">
      <a href={waHref} target="_blank" rel="noopener noreferrer">
        <Button variant="secondary" type="button" size="sm">
          <MessageCircle className="h-4 w-4" />
          Send via WhatsApp
        </Button>
      </a>
      <a href={smsHref}>
        <Button variant="secondary" type="button" size="sm">
          <Smartphone className="h-4 w-4" />
          Send via SMS
        </Button>
      </a>
      <CopyMessageButton message={message} />
    </div>
  );
}
