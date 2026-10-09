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

export interface ScheduleEntry {
  monthNumber: number;
  dueDate: number;
  principalPaise: number;
  interestPaise: number;
  amountPaise: number;
}

/**
 * Builds the month-by-month repayment schedule, split into principal and
 * interest components. Both components are divided evenly across the
 * tenure (interest is already flat/simple, not reducing-balance), with any
 * leftover paise from rounding absorbed into the final month so the
 * schedule sums exactly to principal + totalInterestPaise.
 *
 * For INTEREST_ONLY loans, only the final month carries a principal
 * component — every other month is interest-only, matching
 * calculateInterestOnly's "bullet" repayment shape.
 */
export function buildRepaymentSchedule(params: {
  startDate: number;
  tenureMonths: number;
  repaymentType: "EMI" | "INTEREST_ONLY";
  principalPaise: number;
  totalInterestPaise: number;
}): ScheduleEntry[] {
  const { startDate, tenureMonths, repaymentType, principalPaise, totalInterestPaise } =
    params;

  const schedule: ScheduleEntry[] = [];
  let principalRunning = 0;
  let interestRunning = 0;

  for (let month = 1; month <= tenureMonths; month++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + month);

    const isLastMonth = month === tenureMonths;
    let monthPrincipalPaise: number;
    let monthInterestPaise: number;

    if (repaymentType === "INTEREST_ONLY") {
      monthInterestPaise = Math.round(totalInterestPaise / tenureMonths);
      monthPrincipalPaise = isLastMonth ? principalPaise : 0;
    } else if (isLastMonth) {
      monthPrincipalPaise = principalPaise - principalRunning;
      monthInterestPaise = totalInterestPaise - interestRunning;
    } else {
      // Matches calculateEmi's rounding: round the combined payment once,
      // not the principal/interest components separately, so this figure
      // always agrees with the EMI shown on the loan summary.
      const emiPaise = Math.round(
        (principalPaise + totalInterestPaise) / tenureMonths
      );
      monthPrincipalPaise = Math.round(principalPaise / tenureMonths);
      monthInterestPaise = emiPaise - monthPrincipalPaise;
    }

    principalRunning += monthPrincipalPaise;
    interestRunning += monthInterestPaise;

    schedule.push({
      monthNumber: month,
      dueDate: dueDate.getTime(),
      principalPaise: monthPrincipalPaise,
      interestPaise: monthInterestPaise,
      amountPaise: monthPrincipalPaise + monthInterestPaise,
    });
  }

  return schedule;
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
