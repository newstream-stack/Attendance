import { db } from '../config/database';

export interface DispatchDate {
  id: string;
  user_id: string;
  work_date: string;
  clock_in_time: string | null;   // HH:MM
  clock_out_time: string | null;  // HH:MM
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

export async function findDispatchDateByDate(userId: string, workDate: string): Promise<DispatchDate | undefined> {
  return db<DispatchDate>('dispatch_dates').where({ user_id: userId, work_date: workDate }).first();
}

export async function addDispatchDate(
  userId: string,
  workDate: string,
  clockInTime?: string,
  clockOutTime?: string,
  note?: string,
): Promise<DispatchDate> {
  const [row] = await db<DispatchDate>('dispatch_dates')
    .insert({
      user_id: userId,
      work_date: workDate,
      clock_in_time: clockInTime ?? null,
      clock_out_time: clockOutTime ?? null,
      note: note ?? null,
    })
    .returning('*');
  return row;
}

export async function bulkAddDispatchDates(
  entries: { user_id: string; work_date: string; clock_in_time: string | null; clock_out_time: string | null; note: string | null }[],
): Promise<number> {
  if (entries.length === 0) return 0;
  // ignore conflicts (same user_id + work_date)
  const result = await db('dispatch_dates')
    .insert(entries)
    .onConflict(['user_id', 'work_date'])
    .ignore();
  return (result as unknown as { rowCount: number }).rowCount ?? entries.length;
}

export async function deleteDispatchDate(id: string): Promise<void> {
  await db('dispatch_dates').where({ id }).delete();
}
