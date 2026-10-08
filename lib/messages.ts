import { formatPaise } from "@/lib/currency";

interface MessageLoan {
  principalPaise: number;
  annualRatePercent: number;
  totalInterestPaise: number;
  emiPaise: number;
  tenureMonths: number;
  finalTotalPaise: number;
  startDate: number;
  repaymentType: "EMI" | "INTEREST_ONLY";
}

interface MessageContact {
  name: string;
}

export function buildConfirmationMessage(
  contact: MessageContact,
  loan: MessageLoan
): string {
  const startDate = new Date(loan.startDate).toLocaleDateString("en-IN");

  const repaymentLine =
    loan.repaymentType === "INTEREST_ONLY"
      ? `Interest-only: ${formatPaise(loan.emiPaise)}/month for ${loan.tenureMonths} months, then the full principal (${formatPaise(loan.principalPaise)}) + final interest due in the last month\n`
      : `EMI: ${formatPaise(loan.emiPaise)}/month for ${loan.tenureMonths} months\n`;

  return (
    `Hi ${contact.name}, this confirms a loan given to you, recorded via Happy Lending:\n` +
    `Principal: ${formatPaise(loan.principalPaise)}\n` +
    `Interest: ${loan.annualRatePercent}% p.a. (${formatPaise(loan.totalInterestPaise)})\n` +
    repaymentLine +
    `Total payable: ${formatPaise(loan.finalTotalPaise)}\n` +
    `Start date: ${startDate}\n` +
    `Please confirm receipt of this message.`
  );
}

export function buildClosureMessage(
  contact: MessageContact,
  loan: MessageLoan
): string {
  return (
    `Hi ${contact.name}, this confirms your loan with Happy Lending has been fully settled.\n` +
    `Principal: ${formatPaise(loan.principalPaise)}\n` +
    `Total paid: ${formatPaise(loan.finalTotalPaise)}\n` +
    `Thank you for repaying in full!`
  );
}

export function buildReminderMessage(
  contact: MessageContact,
  loan: MessageLoan
): string {
  const dueLine =
    loan.repaymentType === "INTEREST_ONLY"
      ? `Interest due: ${formatPaise(loan.emiPaise)}/month\n`
      : `EMI due: ${formatPaise(loan.emiPaise)}/month\n`;

  return (
    `Hi ${contact.name}, this is a friendly reminder about your loan with Happy Lending.\n` +
    dueLine +
    `Total payable: ${formatPaise(loan.finalTotalPaise)}\n` +
    `Please make your payment at the earliest. Thank you!`
  );
}
