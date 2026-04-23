function completedMonths(hire: Date, asOf: Date): number {
  let m =
    (asOf.getFullYear() - hire.getFullYear()) * 12 +
    (asOf.getMonth() - hire.getMonth());
  if (asOf.getDate() < hire.getDate()) m -= 1;
  return m;
}

function tierForMonths(totalMonths: number): number {
  if (totalMonths < 6) return 0;
  if (totalMonths < 12) return 3;
  const years = Math.floor(totalMonths / 12);
  if (years < 2) return 7;
  if (years < 3) return 10;
  if (years < 5) return 14;
  if (years < 10) return 15;
  return Math.min(15 + (years - 10), 30);
}

/**
 * Taiwan Labor Standards Act Article 38 — Annual Leave Entitlement (曆年制)
 *
 * When called with Jan 1 of a target year, applies prorated calculation:
 * if the hire anniversary falls within the year, the entitlement is weighted
 * between the old tier (before anniversary) and new tier (after anniversary).
 *
 * Formula: proportionBefore × oldTier + (1 − proportionBefore) × newTier
 * where proportionBefore = ((anniversaryMonth − 1) + (anniversaryDay − 1) / daysInAnniversaryMonth) / 12
 *
 * Example (hire 2003-02-25, year 2026):
 *   proportionBefore = (1 + 24/28) / 12 ≈ 0.1548
 *   result = 0.1548 × 27 + 0.8452 × 28 ≈ 27.85 days
 */
export function calcAnnualLeaveDays(hireDateStr: string, asOfDate = new Date()): number {
  const hire = new Date(hireDateStr);
  const year = asOfDate.getFullYear();

  const monthsAtJan1 = completedMonths(hire, new Date(year, 0, 1));
  const oldTier = tierForMonths(monthsAtJan1);

  // Non-Jan-1 call: return tier as of that date (no prorating)
  if (asOfDate.getMonth() !== 0 || asOfDate.getDate() !== 1) {
    return tierForMonths(completedMonths(hire, asOfDate));
  }

  // If hired on Jan 1 the anniversary always lands on year start, no prorating needed
  if (hire.getMonth() === 0 && hire.getDate() === 1) return oldTier;

  // Build anniversary date in this calendar year
  const anniversaryDate = new Date(year, hire.getMonth(), hire.getDate());
  // Feb 29 in a non-leap year resolves to Mar 1 — skip prorating
  if (anniversaryDate.getMonth() !== hire.getMonth()) return oldTier;

  const newTier = tierForMonths(completedMonths(hire, anniversaryDate));
  if (oldTier === newTier) return oldTier;

  // Proportion of year that falls before the hire anniversary
  const daysInAnniversaryMonth = new Date(year, hire.getMonth() + 1, 0).getDate();
  const proportionBefore =
    (hire.getMonth() + (hire.getDate() - 1) / daysInAnniversaryMonth) / 12;

  return proportionBefore * oldTier + (1 - proportionBefore) * newTier;
}

/** Convert days to minutes (8h/day), preserving decimals */
export function daysToMins(days: number): number {
  return days * 8 * 60;
}
