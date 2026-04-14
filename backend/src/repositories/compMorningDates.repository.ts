import { db } from '../config/database';

export interface CompMorningDate {
  id: string;
  user_id: string;
  work_date: string;
  note: string | null;
  created_at: Date;
}

export async function listCompMorningDates(userId: string, year?: number, month?: number): Promise<CompMorningDate[]> {
  const q = db<CompMorningDate>('comp_morning_dates').where({ user_id: userId }).orderBy('work_date');
  if (year && month) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    q.whereBetween('work_date', [start, end]);
  } else if (year) {
    q.whereRaw('EXTRACT(YEAR FROM work_date) = ?', [year]);
  }
  return q;
}

export async function listCompMorningDatesByRange(userId: string, start: string, end: string): Promise<CompMorningDate[]> {
  return db<CompMorningDate>('comp_morning_dates')
    .where({ user_id: userId })
    .whereBetween('work_date', [start, end])
    .orderBy('work_date');
}

export async function listCompMorningDatesByUsers(userIds: string[], start: string, end: string): Promise<CompMorningDate[]> {
  if (userIds.length === 0) return [];
  return db<CompMorningDate>('comp_morning_dates')
    .whereIn('user_id', userIds)
    .whereBetween('work_date', [start, end]);
}

export async function findCompMorningDateByDate(userId: string, workDate: string): Promise<CompMorningDate | undefined> {
  return db<CompMorningDate>('comp_morning_dates').where({ user_id: userId, work_date: workDate }).first();
}

export async function addCompMorningDate(userId: string, workDate: string, note?: string): Promise<CompMorningDate> {
  const [row] = await db<CompMorningDate>('comp_morning_dates')
    .insert({ user_id: userId, work_date: workDate, note: note ?? null })
    .returning('*');
  return row;
}

export async function bulkAddCompMorningDates(
  entries: { user_id: string; work_date: string; note: string | null }[],
): Promise<number> {
  if (entries.length === 0) return 0;
  const result = await db('comp_morning_dates')
    .insert(entries)
    .onConflict(['user_id', 'work_date'])
    .ignore();
  return (result as unknown as { rowCount: number }).rowCount ?? entries.length;
}

export async function deleteCompMorningDate(id: string): Promise<void> {
  await db('comp_morning_dates').where({ id }).delete();
}
