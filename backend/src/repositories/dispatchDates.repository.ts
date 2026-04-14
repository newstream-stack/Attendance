import { db } from '../config/database';

export interface DispatchDate {
  id: string;
  user_id: string;
  work_date: string;
  note: string | null;
  created_at: Date;
}

export async function listDispatchDates(userId: string, year?: number, month?: number): Promise<DispatchDate[]> {
  const q = db<DispatchDate>('dispatch_dates').where({ user_id: userId }).orderBy('work_date');
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

export async function listDispatchDatesByUsers(userIds: string[], start: string, end: string): Promise<DispatchDate[]> {
  return db<DispatchDate>('dispatch_dates')
    .whereIn('user_id', userIds)
    .whereBetween('work_date', [start, end])
    .orderBy('work_date');
}

export async function addDispatchDate(userId: string, workDate: string, note?: string): Promise<DispatchDate> {
  const [row] = await db<DispatchDate>('dispatch_dates')
    .insert({ user_id: userId, work_date: workDate, note: note ?? null })
    .returning('*');
  return row;
}

export async function deleteDispatchDate(id: string): Promise<void> {
  await db('dispatch_dates').where({ id }).delete();
}
