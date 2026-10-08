function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const targetDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const daysInTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(targetDay, daysInTargetMonth));
  return d;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns the highest reminder period index (0-based) that has come due by
 * `now`, or null if none has. Periods run monthly from `firstReminderDate`
 * for `reminderMonths` occurrences.
 */
export function currentDuePeriod(
  firstReminderDate: number,
  reminderMonths: number,
  now: Date = new Date()
): number | null {
  const first = startOfDay(new Date(firstReminderDate));
  const today = startOfDay(now);
  if (today < first) return null;

  let period: number | null = null;
  for (let p = 0; p < reminderMonths; p++) {
    if (startOfDay(addMonths(first, p)) <= today) {
      period = p;
    } else {
      break;
    }
  }
  return period;
}

export function periodDueDate(firstReminderDate: number, period: number): Date {
  return addMonths(new Date(firstReminderDate), period);
}
