import { db } from '../config/database';

export interface CompMorningSchedule {
  id: string;
  user_id: string;
  days_of_week: string; // comma-separated: "3,5" = 週三、週五
  note: string | null;
  created_at: Date;
}

export async function listCompMorningSchedules(userId: string): Promise<CompMorningSchedule[]> {
  return db<CompMorningSchedule>('comp_morning_schedules')
    .where({ user_id: userId })
    .orderBy('created_at');
}

export async function addCompMorningSchedule(
  userId: string,
  daysOfWeek: string,
  note?: string,
): Promise<CompMorningSchedule> {
  const [row] = await db<CompMorningSchedule>('comp_morning_schedules')
    .insert({ user_id: userId, days_of_week: daysOfWeek, note: note ?? null })
    .returning('*');
  return row;
}

export async function deleteCompMorningSchedule(id: string): Promise<void> {
  await db('comp_morning_schedules').where({ id }).delete();
}

export async function listCompMorningSchedulesByUsers(userIds: string[]): Promise<CompMorningSchedule[]> {
  if (userIds.length === 0) return [];
  return db<CompMorningSchedule>('comp_morning_schedules').whereIn('user_id', userIds);
}
