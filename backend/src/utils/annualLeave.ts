/**
 * Taiwan Labor Standards Act Article 38 — Annual Leave Entitlement
 * Returns number of days based on full years of service.
 */
export function calcAnnualLeaveDays(hireDateStr: string, asOfDate = new Date()): number {
  const hire = new Date(hireDateStr);
  const diffMs = asOfDate.getTime() - hire.getTime();
  const months = diffMs / (1000 * 60 * 60 * 24 * 30.4375);

  if (months < 6) return 0;
  if (months < 12) return 3;

  const years = Math.floor(months / 12);
  if (years < 2) return 7;
  if (years < 3) return 10;
  if (years < 5) return 14;
  if (years < 10) return 15;
  return Math.min(15 + (years - 10) + 1, 30);
}

/** Convert days to minutes (8h/day) */
export function daysToMins(days: number): number {
  return days * 8 * 60;
}
