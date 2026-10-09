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

function monthlyRateFraction(annualRatePercent: number): number {
  return annualRatePercent / 1200;
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
 * Reducing-balance (diminishing/amortizing) EMI: the standard formula banks
 * and NBFCs use. Interest each month is charged on the outstanding balance
 * rather than the original principal, so the interest portion of the EMI
 * shrinks over time while the principal portion grows, even though the EMI
 * itself stays level.
 */
export function calculateEmiReducing(
  principalPaise: number,
  annualRatePercent: number,
  tenureMonths: number
): EmiResult {
  const r = monthlyRateFraction(annualRatePercent);
  const emiPaise =
    r === 0
      ? Math.round(principalPaise / tenureMonths)
      : Math.round(
          (principalPaise * r * Math.pow(1 + r, tenureMonths)) /
            (Math.pow(1 + r, tenureMonths) - 1)
        );

  // Walk the amortization to get the exact total interest (accounts for
  // per-month rounding and the final month absorbing any leftover balance).
  let balance = principalPaise;
  let totalInterestPaise = 0;
  for (let i = 1; i <= tenureMonths; i++) {
    const interestPaise = r === 0 ? 0 : Math.round(balance * r);
    totalInterestPaise += interestPaise;
    const isLast = i === tenureMonths;
    const principalPortion = isLast
      ? balance
      : Math.max(Math.min(emiPaise - interestPaise, balance), 0);
    balance -= principalPortion;
  }

  return {
    emiPaise,
    totalInterestPaise,
    finalTotalPaise: principalPaise + totalInterestPaise,
  };
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
 * Builds a reducing-balance amortization schedule by walking the
 * outstanding balance month by month: interest is charged on whatever
 * balance remains, the rest of the EMI goes to principal, and the final
 * month absorbs any leftover balance from rounding. `startMonth` lets
 * rebuildRemainingReducingBalanceSchedule resume numbering/dates partway
 * through an existing loan.
 */
export function buildReducingBalanceSchedule(params: {
  startDate: number;
  startMonth?: number;
  tenureMonths: number;
  principalPaise: number;
  annualRatePercent: number;
  emiPaise: number;
}): ScheduleEntry[] {
  const { startDate, tenureMonths, principalPaise, annualRatePercent, emiPaise } = params;
  const startMonth = params.startMonth ?? 0;
  const r = monthlyRateFraction(annualRatePercent);

  const schedule: ScheduleEntry[] = [];
  let balance = principalPaise;
  for (let i = 1; i <= tenureMonths; i++) {
    const monthNumber = startMonth + i;
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + monthNumber);

    const isLast = i === tenureMonths;
    const interestPaise = r === 0 ? 0 : Math.round(balance * r);
    const principalPaiseThisMonth = isLast
      ? balance
      : Math.max(Math.min(emiPaise - interestPaise, balance), 0);
    balance -= principalPaiseThisMonth;

    schedule.push({
      monthNumber,
      dueDate: dueDate.getTime(),
      principalPaise: principalPaiseThisMonth,
      interestPaise,
      amountPaise: principalPaiseThisMonth + interestPaise,
    });
  }

  return schedule;
}

/**
 * Rebuilds only the not-yet-paid tail of a reducing-balance schedule after a
 * loan's tenure/rate is edited. Re-amortizes the actual remaining balance
 * (principal minus whatever's already been paid off) over the remaining
 * months at the new rate, with a fresh EMI solved for that balance.
 */
export function rebuildRemainingReducingBalanceSchedule(params: {
  startDate: number;
  newTenureMonths: number;
  annualRatePercent: number;
  paidMonths: number;
  remainingPrincipalPaise: number;
}): ScheduleEntry[] {
  const remainingMonths = params.newTenureMonths - params.paidMonths;
  const { emiPaise } = calculateEmiReducing(
    params.remainingPrincipalPaise,
    params.annualRatePercent,
    remainingMonths
  );
  return buildReducingBalanceSchedule({
    startDate: params.startDate,
    startMonth: params.paidMonths,
    tenureMonths: remainingMonths,
    principalPaise: params.remainingPrincipalPaise,
    annualRatePercent: params.annualRatePercent,
    emiPaise,
  });
}

/**
 * Solves for tenure (months) given a desired reducing-balance EMI. Closed
 * form from the standard amortization formula solved for n. Returns null if
 * the EMI is too low to ever cover the first month's interest.
 */
export function calculateTenureFromEmiReducing(
  principalPaise: number,
  annualRatePercent: number,
  desiredEmiPaise: number
): number | null {
  const r = monthlyRateFraction(annualRatePercent);
  if (r === 0) {
    return desiredEmiPaise > 0 ? Math.ceil(principalPaise / desiredEmiPaise) : null;
  }
  const firstMonthInterestPaise = principalPaise * r;
  if (desiredEmiPaise <= firstMonthInterestPaise) return null;

  const n =
    Math.log(desiredEmiPaise / (desiredEmiPaise - firstMonthInterestPaise)) /
    Math.log(1 + r);
  return Math.ceil(n);
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
