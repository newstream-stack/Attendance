/**
 * Taiwan Labor Standards Act Article 38 — Annual Leave Entitlement (曆年制)
 *
 * Calculates completed months using calendar arithmetic to avoid floating-point
 * imprecision near month boundaries. Caller passes asOfDate = Jan 1 of the target
 * year so entitlement is always evaluated at the start of the calendar year.
 */
export function calcAnnualLeaveDays(hireDateStr: string, asOfDate = new Date()): number {
  const hire = new Date(hireDateStr);

  let totalMonths =
    (asOfDate.getFullYear() - hire.getFullYear()) * 12 +
    (asOfDate.getMonth() - hire.getMonth());
  if (asOfDate.getDate() < hire.getDate()) totalMonths -= 1;

  if (totalMonths < 6) return 0;
  if (totalMonths < 12) return 3;

  const years = Math.floor(totalMonths / 12);
  if (years < 2) return 7;
  if (years < 3) return 10;
  if (years < 5) return 14;
  if (years < 10) return 15;
  return Math.min(15 + (years - 10), 30);
}

/** Convert days to minutes (8h/day) */
export function daysToMins(days: number): number {
  return days * 8 * 60;
}
