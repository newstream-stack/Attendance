import { db } from '../config/database';
import { PublicHoliday } from '../types';

export async function listByYear(year: number): Promise<PublicHoliday[]> {
  return db<PublicHoliday>('public_holidays')
    .where({ year })
    .orderBy('holiday_date', 'asc');
}

export async function create(data: { holiday_date: string; name: string; year: number }): Promise<PublicHoliday> {
  const [row] = await db<PublicHoliday>('public_holidays').insert(data).returning('*');
  return row;
}

export async function remove(id: string): Promise<PublicHoliday | undefined> {
  const [row] = await db<PublicHoliday>('public_holidays').where({ id }).delete().returning('*');
  return row;
}

export async function bulkInsertIgnore(rows: { holiday_date: string; name: string; year: number }[]): Promise<number> {
  if (rows.length === 0) return 0;
  const inserted = await db<PublicHoliday>('public_holidays')
    .insert(rows)
    .onConflict('holiday_date')
    .ignore()
    .returning('id');
  return Array.isArray(inserted) ? inserted.length : 0;
}
