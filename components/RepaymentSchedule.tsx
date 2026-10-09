"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, MessageCircle, Smartphone } from "lucide-react";
import { markInstallmentPaid, recordPartialPayment } from "@/actions/installments";
import { buildWaLink } from "@/lib/whatsapp";
import { buildSmsLink } from "@/lib/sms";
import { buildInstallmentPaidMessage, buildPartialPaymentMessage } from "@/lib/messages";
import { formatPaise } from "@/lib/currency";
import { Button } from "@/components/ui/Button";

interface Installment {
  id: number;
  monthNumber: number;
  dueDate: number;
  principalPaise: number | null;
  interestPaise: number | null;
  amountPaise: number;
  amountPaidPaise: number | null;
  status: "PENDING" | "PARTIAL" | "PAID";
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
  const [partialOpenId, setPartialOpenId] = useState<number | null>(null);
  const [partialAmount, setPartialAmount] = useState("");
  const [partialError, setPartialError] = useState<string | null>(null);

  const owed = (i: Installment) =>
    i.status === "PAID" ? 0 : i.amountPaise - (i.amountPaidPaise ?? 0);

  const remainingPaise = installments.reduce((sum, i) => sum + owed(i), 0);

  function handleMarkPaid(installment: Installment) {
    startTransition(() => {
      markInstallmentPaid(loanId, installment.id);
    });
  }

  function openPartial(installment: Installment) {
    setPartialOpenId(installment.id);
    setPartialAmount("");
    setPartialError(null);
  }

  function closePartial() {
    setPartialOpenId(null);
    setPartialAmount("");
    setPartialError(null);
  }

  function handleRecordPartial(installment: Installment) {
    setPartialError(null);
    const amount = Number(partialAmount);
    if (!partialAmount || amount <= 0) {
      setPartialError("Enter an amount greater than zero.");
      return;
    }
    startTransition(async () => {
      const result = await recordPartialPayment(loanId, installment.id, amount);
      if (result?.error) {
        setPartialError(result.error);
        return;
      }
      closePartial();
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
          const owedPaise = owed(installment);
          const remainingAfterFull = remainingPaise - owedPaise;
          const fullPaidMessage = buildInstallmentPaidMessage(
            contact,
            installment,
            remainingAfterFull
          );
          const waHref = buildWaLink(contact.phone, fullPaidMessage);
          const smsHref = buildSmsLink(contact.phone, fullPaidMessage);

          const partialAmountPaise = Math.round(Number(partialAmount || "0") * 100);
          const remainingThisMonthAfterPartial = Math.max(
            owedPaise - partialAmountPaise,
            0
          );
          const remainingOverallAfterPartial = remainingPaise - Math.min(partialAmountPaise, owedPaise);
          const partialMessage = buildPartialPaymentMessage(
            contact,
            installment,
            partialAmountPaise,
            remainingThisMonthAfterPartial,
            remainingOverallAfterPartial
          );
          const partialWaHref = buildWaLink(contact.phone, partialMessage);
          const partialSmsHref = buildSmsLink(contact.phone, partialMessage);

          return (
            <div
              key={installment.id}
              className="flex flex-col gap-2 py-2.5 text-sm"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
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
                  {installment.status === "PARTIAL" && (
                    <p className="text-xs text-warning">
                      Received {formatPaise(installment.amountPaidPaise ?? 0)} ·{" "}
                      {formatPaise(owedPaise)} remaining this month
                    </p>
                  )}
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
                      variant="secondary"
                      size="sm"
                      disabled={isPending}
                      onClick={() =>
                        partialOpenId === installment.id
                          ? closePartial()
                          : openPartial(installment)
                      }
                    >
                      Partial
                    </Button>
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

              {partialOpenId === installment.id && (
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Amount received (₹)"
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                      className="w-40 rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
                      autoFocus
                    />
                    <a
                      href={partialWaHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleRecordPartial(installment)}
                    >
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isPending}
                        title="Record and notify via WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </a>
                    <a href={partialSmsHref} onClick={() => handleRecordPartial(installment)}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isPending}
                        title="Record and notify via SMS"
                      >
                        <Smartphone className="h-4 w-4" />
                      </Button>
                    </a>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleRecordPartial(installment)}
                    >
                      Record
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isPending}
                      onClick={closePartial}
                    >
                      Cancel
                    </Button>
                  </div>
                  {partialError && <p className="text-xs text-danger">{partialError}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
