import { listByYear, create, remove, bulkInsertIgnore } from '../repositories/publicHoliday.repository';
import { AppError } from '../middleware/errorHandler';
import { getTaiwanHolidaysByYear } from '../utils/twHolidays';

export async function getPublicHolidaysByYear(year: number) {
  return listByYear(year);
}

export async function createPublicHoliday(data: { holiday_date: string; name: string }) {
  const year = new Date(data.holiday_date).getFullYear();
  try {
    return await create({ ...data, year });
  } catch (err: any) {
    if (err.code === '23505') throw new AppError(409, '該日期已存在公假記錄');
    throw err;
  }
}

export async function deletePublicHoliday(id: string) {
  const row = await remove(id);
  if (!row) throw new AppError(404, '找不到公假記錄');
}

export async function importTaiwanHolidays(year: number): Promise<{ inserted: number }> {
  const rows = getTaiwanHolidaysByYear(year);
  if (rows.length === 0) throw new AppError(400, '該年度無內建台灣假期資料（僅支援 2024–2027）');
  const inserted = await bulkInsertIgnore(rows);
  return { inserted };
}
