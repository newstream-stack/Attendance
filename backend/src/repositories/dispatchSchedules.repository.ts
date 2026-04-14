import { db } from '../config/database';

export interface DispatchSchedule {
  id: string;
  user_id: string;
  days_of_week: string; // "1,4" = 週一、週四
  clock_in_time: string;
  clock_out_time: string;
  note: string | null;
  created_at: Date;
}

export async function listSchedules(userId: string): Promise<DispatchSchedule[]> {
  return db<DispatchSchedule>('dispatch_schedules')
    .where({ user_id: userId })
    .orderBy('created_at');
}

export async function addSchedule(
  userId: string,
  daysOfWeek: string,
  clockInTime: string,
  clockOutTime: string,
  note?: string,
): Promise<DispatchSchedule> {
  const [row] = await db<DispatchSchedule>('dispatch_schedules')
    .insert({ user_id: userId, days_of_week: daysOfWeek, clock_in_time: clockInTime, clock_out_time: clockOutTime, note: note ?? null })
    .returning('*');
  return row;
}

export async function deleteSchedule(id: string): Promise<void> {
  await db('dispatch_schedules').where({ id }).delete();
}
