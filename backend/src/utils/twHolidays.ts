/** Static Taiwan national holidays 2024-2027 */
export interface TwHoliday {
  holiday_date: string; // YYYY-MM-DD
  name: string;
  year: number;
}

const RAW: { date: string; name: string }[] = [
  // 2024
  { date: '2024-01-01', name: '元旦' },
  { date: '2024-02-08', name: '農曆除夕' },
  { date: '2024-02-09', name: '春節' },
  { date: '2024-02-10', name: '春節' },
  { date: '2024-02-11', name: '春節' },
  { date: '2024-02-12', name: '春節' },
  { date: '2024-02-13', name: '春節' },
  { date: '2024-02-14', name: '春節' },
  { date: '2024-02-28', name: '和平紀念日' },
  { date: '2024-04-04', name: '兒童節' },
  { date: '2024-04-05', name: '清明節' },
  { date: '2024-05-01', name: '勞動節' },
  { date: '2024-06-10', name: '端午節' },
  { date: '2024-09-17', name: '中秋節' },
  { date: '2024-10-10', name: '國慶日' },
  // 2025
  { date: '2025-01-01', name: '元旦' },
  { date: '2025-01-27', name: '農曆除夕' },
  { date: '2025-01-28', name: '春節' },
  { date: '2025-01-29', name: '春節' },
  { date: '2025-01-30', name: '春節' },
  { date: '2025-01-31', name: '春節' },
  { date: '2025-02-01', name: '春節' },
  { date: '2025-02-02', name: '春節' },
  { date: '2025-02-28', name: '和平紀念日' },
  { date: '2025-04-03', name: '兒童節補假' },
  { date: '2025-04-04', name: '兒童節／清明節' },
  { date: '2025-05-01', name: '勞動節' },
  { date: '2025-05-31', name: '端午節' },
  { date: '2025-10-06', name: '中秋節' },
  { date: '2025-10-10', name: '國慶日' },
  // 2026
  { date: '2026-01-01', name: '元旦' },
  { date: '2026-02-17', name: '農曆除夕' },
  { date: '2026-02-18', name: '春節' },
  { date: '2026-02-19', name: '春節' },
  { date: '2026-02-20', name: '春節' },
  { date: '2026-02-21', name: '春節' },
  { date: '2026-02-22', name: '春節' },
  { date: '2026-02-23', name: '春節' },
  { date: '2026-02-28', name: '和平紀念日' },
  { date: '2026-04-04', name: '兒童節／清明節' },
  { date: '2026-05-01', name: '勞動節' },
  { date: '2026-06-19', name: '端午節' },
  { date: '2026-09-25', name: '中秋節' },
  { date: '2026-10-10', name: '國慶日' },
  // 2027
  { date: '2027-01-01', name: '元旦' },
  { date: '2027-02-06', name: '農曆除夕' },
  { date: '2027-02-07', name: '春節' },
  { date: '2027-02-08', name: '春節' },
  { date: '2027-02-09', name: '春節' },
  { date: '2027-02-10', name: '春節' },
  { date: '2027-02-11', name: '春節' },
  { date: '2027-02-12', name: '春節' },
  { date: '2027-02-28', name: '和平紀念日' },
  { date: '2027-04-04', name: '兒童節' },
  { date: '2027-04-05', name: '清明節' },
  { date: '2027-05-01', name: '勞動節' },
  { date: '2027-06-09', name: '端午節' },
  { date: '2027-09-15', name: '中秋節' },
  { date: '2027-10-10', name: '國慶日' },
];

export function getTaiwanHolidaysByYear(year: number): TwHoliday[] {
  return RAW
    .filter((h) => h.date.startsWith(String(year)))
    .map((h) => ({ holiday_date: h.date, name: h.name, year }));
}
