"use client";

import { useTransition } from "react";
import { CheckCircle2, MessageCircle, Smartphone } from "lucide-react";
import { markInstallmentPaid } from "@/actions/installments";
import { buildWaLink } from "@/lib/whatsapp";
import { buildSmsLink } from "@/lib/sms";
import { buildInstallmentPaidMessage } from "@/lib/messages";
import { formatPaise } from "@/lib/currency";
import { Button } from "@/components/ui/Button";

interface Installment {
  id: number;
  monthNumber: number;
  dueDate: number;
  principalPaise: number | null;
  interestPaise: number | null;
  amountPaise: number;
  status: "PENDING" | "PAID";
  paidAt: number | null;
}

export function RepaymentSchedule({
  loanId,
  contact,
  installments,
}: {
  loanId: number;
  contact: { name: string; phone: string };
  installments: Installment[];
}) {
  const [isPending, startTransition] = useTransition();

  const remainingPaise = installments
    .filter((i) => i.status !== "PAID")
    .reduce((sum, i) => sum + i.amountPaise, 0);

  function handleMarkPaid(installment: Installment) {
    startTransition(() => {
      markInstallmentPaid(loanId, installment.id);
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-muted">Remaining balance</span>
        <span className="font-semibold text-foreground">
          {formatPaise(remainingPaise)}
        </span>
      </div>
      <div className="divide-y divide-border">
        {installments.map((installment) => {
          const remainingAfter = remainingPaise - installment.amountPaise;
          const message = buildInstallmentPaidMessage(
            contact,
            installment,
            remainingAfter
          );
          const waHref = buildWaLink(contact.phone, message);
          const smsHref = buildSmsLink(contact.phone, message);

          return (
            <div
              key={installment.id}
              className="flex flex-col gap-2 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  Month {installment.monthNumber} ·{" "}
                  {new Date(installment.dueDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                {installment.principalPaise != null && installment.interestPaise != null && (
                  <p className="text-xs text-muted">
                    Principal {formatPaise(installment.principalPaise)} + Interest{" "}
                    {formatPaise(installment.interestPaise)}
                  </p>
                )}
                <p className="text-sm font-semibold text-foreground">
                  {formatPaise(installment.amountPaise)}
                </p>
              </div>
              {installment.status === "PAID" ? (
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Paid
                </span>
              ) : (
                <div className="flex flex-wrap shrink-0 gap-2">
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleMarkPaid(installment)}
                  >
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isPending}
                      title="Mark paid and notify via WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </a>
                  <a href={smsHref} onClick={() => handleMarkPaid(installment)}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isPending}
                      title="Mark paid and notify via SMS"
                    >
                      <Smartphone className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleMarkPaid(installment)}
                  >
                    Mark paid
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
