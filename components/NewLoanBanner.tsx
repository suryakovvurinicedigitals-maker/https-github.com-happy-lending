import { Sparkles, FileDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ConfirmationButtons } from "@/components/ConfirmationButtons";

export function NewLoanBanner({
  contact,
  loan,
}: {
  contact: { name: string; phone: string };
  loan: {
    id: number;
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
  return (
    <Card>
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-accent" />
        Loan created
      </div>
      <p className="mb-3 text-sm text-muted">
        Let {contact.name} know, and keep a signed record.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <ConfirmationButtons contact={contact} loan={loan} />
        <a
          href={`/api/agreement/${loan.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
        >
          <FileDown className="h-4 w-4" />
          Download agreement PDF
        </a>
      </div>
    </Card>
  );
}
