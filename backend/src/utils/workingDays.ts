import { db } from '../config/database';

const MINS_PER_DAY = 480; // 8h working day
const MINS_HALF_DAY = 240;

/** Returns YYYY-MM-DD strings for every calendar day between start and end (inclusive) */
function dateRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cur <= last) {
    dates.push(cur.toLocaleDateString('en-CA')); // YYYY-MM-DD
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

/** Fetch public holiday dates for the years covered by the range */
async function getHolidaySet(startDate: Date, endDate: Date): Promise<Set<string>> {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  const rows = await db('public_holidays')
    .whereBetween('year', [startYear, endYear])
    .select('holiday_date');
  return new Set(rows.map((r: { holiday_date: string | Date }) =>
    new Date(r.holiday_date).toLocaleDateString('en-CA'),
  ));
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

/**
 * Calculate working minutes between start and end in Taipei timezone.
 * @param halfDay - if true, result is exactly MINS_HALF_DAY
 */
export async function calculateWorkingMinutes(
  startTime: Date,
  endTime: Date,
  halfDay = false,
): Promise<number> {
  if (halfDay) return MINS_HALF_DAY;

  // Convert to Taipei date
  const toTaipei = (d: Date) =>
    new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));

  const startTaipei = toTaipei(startTime);
  const endTaipei = toTaipei(endTime);

  const holidays = await getHolidaySet(startTaipei, endTaipei);
  const dates = dateRange(startTaipei, endTaipei);

  const workingDays = dates.filter((d) => !isWeekend(d) && !holidays.has(d)).length;
  return workingDays * MINS_PER_DAY;
}
