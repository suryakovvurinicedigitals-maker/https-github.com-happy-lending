export interface EmiResult {
  emiPaise: number;
  totalInterestPaise: number;
  finalTotalPaise: number;
}

export interface InterestOnlyResult {
  monthlyInterestPaise: number;
  totalInterestPaise: number;
  finalTotalPaise: number;
  finalMonthPaymentPaise: number;
}

function flatMonthlyInterest(
  principalPaise: number,
  annualRatePercent: number
): number {
  return (principalPaise * annualRatePercent) / 1200;
}

export function calculateEmi(
  principalPaise: number,
  annualRatePercent: number,
  tenureMonths: number
): EmiResult {
  const monthlyInterest = flatMonthlyInterest(principalPaise, annualRatePercent);
  const totalInterestPaise = Math.round(monthlyInterest * tenureMonths);
  const finalTotalPaise = principalPaise + totalInterestPaise;
  const emiPaise = Math.round(finalTotalPaise / tenureMonths);

  return { emiPaise, totalInterestPaise, finalTotalPaise };
}

/**
 * Interest-only ("bullet") repayment: the borrower pays only the flat
 * monthly interest each month, then the full principal plus that final
 * month's interest as a lump sum at the end of the tenure.
 */
export function calculateInterestOnly(
  principalPaise: number,
  annualRatePercent: number,
  tenureMonths: number
): InterestOnlyResult {
  const monthlyInterestPaise = Math.round(
    flatMonthlyInterest(principalPaise, annualRatePercent)
  );
  const totalInterestPaise = monthlyInterestPaise * tenureMonths;
  const finalTotalPaise = principalPaise + totalInterestPaise;
  const finalMonthPaymentPaise = monthlyInterestPaise + principalPaise;

  return {
    monthlyInterestPaise,
    totalInterestPaise,
    finalTotalPaise,
    finalMonthPaymentPaise,
  };
}

/**
 * Solves for tenure (months) given a desired EMI, using flat/simple
 * interest: the monthly interest is fixed (computed on the original
 * principal), so EMI = principal/n + fixed monthly interest. Returns null
 * if the EMI is too low to ever cover the monthly interest.
 */
export function calculateTenureFromEmi(
  principalPaise: number,
  annualRatePercent: number,
  desiredEmiPaise: number
): number | null {
  const monthlyInterest = flatMonthlyInterest(principalPaise, annualRatePercent);

  if (desiredEmiPaise <= monthlyInterest) {
    return null;
  }

  const n = principalPaise / (desiredEmiPaise - monthlyInterest);
  return Math.ceil(n);
}
