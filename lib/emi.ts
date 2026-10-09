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
 * Splits principalPaise/interestPaise evenly across monthCount months
 * (numbered startMonth+1 .. startMonth+monthCount), with any leftover
 * paise from rounding absorbed into the final month so the schedule sums
 * exactly to principalPaise + interestPaise. Shared by buildRepaymentSchedule
 * (startMonth 0, full loan totals) and rebuildRemainingSchedule (startMonth
 * = months already paid, remaining totals only).
 *
 * For INTEREST_ONLY loans, only the final month carries a principal
 * component — every other month is interest-only, matching
 * calculateInterestOnly's "bullet" repayment shape.
 */
function distributeSchedule(params: {
  startDate: number;
  startMonth: number;
  monthCount: number;
  repaymentType: "EMI" | "INTEREST_ONLY";
  principalPaise: number;
  interestPaise: number;
}): ScheduleEntry[] {
  const { startDate, startMonth, monthCount, repaymentType, principalPaise, interestPaise } =
    params;

  const schedule: ScheduleEntry[] = [];
  let principalRunning = 0;
  let interestRunning = 0;

  for (let i = 1; i <= monthCount; i++) {
    const monthNumber = startMonth + i;
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + monthNumber);

    const isLastMonth = i === monthCount;
    let monthPrincipalPaise: number;
    let monthInterestPaise: number;

    if (repaymentType === "INTEREST_ONLY") {
      monthInterestPaise = isLastMonth
        ? interestPaise - interestRunning
        : Math.round(interestPaise / monthCount);
      monthPrincipalPaise = isLastMonth ? principalPaise - principalRunning : 0;
    } else if (isLastMonth) {
      monthPrincipalPaise = principalPaise - principalRunning;
      monthInterestPaise = interestPaise - interestRunning;
    } else {
      // Matches calculateEmi's rounding: round the combined payment once,
      // not the principal/interest components separately, so this figure
      // always agrees with the EMI shown on the loan summary.
      const emiPaise = Math.round((principalPaise + interestPaise) / monthCount);
      monthPrincipalPaise = Math.round(principalPaise / monthCount);
      monthInterestPaise = emiPaise - monthPrincipalPaise;
    }

    principalRunning += monthPrincipalPaise;
    interestRunning += monthInterestPaise;

    schedule.push({
      monthNumber,
      dueDate: dueDate.getTime(),
      principalPaise: monthPrincipalPaise,
      interestPaise: monthInterestPaise,
      amountPaise: monthPrincipalPaise + monthInterestPaise,
    });
  }

  return schedule;
}

export function buildRepaymentSchedule(params: {
  startDate: number;
  tenureMonths: number;
  repaymentType: "EMI" | "INTEREST_ONLY";
  principalPaise: number;
  totalInterestPaise: number;
}): ScheduleEntry[] {
  return distributeSchedule({
    startDate: params.startDate,
    startMonth: 0,
    monthCount: params.tenureMonths,
    repaymentType: params.repaymentType,
    principalPaise: params.principalPaise,
    interestPaise: params.totalInterestPaise,
  });
}

/**
 * Rebuilds only the not-yet-paid tail of a schedule after a loan's tenure
 * is edited (e.g. the borrower's due date was extended). Already-PAID
 * installments are left completely alone by the caller — this only
 * produces replacement rows for the remaining months, spreading the
 * remaining principal and remaining interest (computed at the new tenure)
 * evenly across the remaining months.
 */
export function rebuildRemainingSchedule(params: {
  startDate: number;
  newTenureMonths: number;
  repaymentType: "EMI" | "INTEREST_ONLY";
  principalPaise: number;
  newTotalInterestPaise: number;
  paidMonths: number;
  paidPrincipalPaise: number;
  paidInterestPaise: number;
}): ScheduleEntry[] {
  const remainingMonths = params.newTenureMonths - params.paidMonths;
  return distributeSchedule({
    startDate: params.startDate,
    startMonth: params.paidMonths,
    monthCount: remainingMonths,
    repaymentType: params.repaymentType,
    principalPaise: params.principalPaise - params.paidPrincipalPaise,
    interestPaise: params.newTotalInterestPaise - params.paidInterestPaise,
  });
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
