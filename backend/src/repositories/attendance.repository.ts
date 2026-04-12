import { db } from '../config/database';
import { AttendanceRecord } from '../types';

export async function findTodayRecord(userId: string, workDate: string): Promise<AttendanceRecord | undefined> {
  return db<AttendanceRecord>('attendance_records')
    .where({ user_id: userId, work_date: workDate })
    .whereIn('status', ['active', 'completed'])
    .orderBy('clock_in', 'desc')
    .first();
}

export async function clockIn(userId: string, workDate: string, ipAddress: string, isLate: boolean): Promise<AttendanceRecord> {
  const [record] = await db<AttendanceRecord>('attendance_records')
    .insert({
      user_id: userId,
      clock_in: db.fn.now(),
      work_date: workDate,
      status: 'active',
      ip_address: ipAddress,
      is_late: isLate,
    })
    .returning('*');
  return record;
}

export async function clockOut(recordId: string, durationMins: number): Promise<AttendanceRecord> {
  const [record] = await db<AttendanceRecord>('attendance_records')
    .where({ id: recordId })
    .update({
      clock_out: db.fn.now(),
      duration_mins: durationMins,
      status: 'completed',
      updated_at: db.fn.now(),
    })
    .returning('*');
  return record;
}

export async function listRecords(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<AttendanceRecord[]> {
  return db<AttendanceRecord>('attendance_records')
    .where({ user_id: userId })
    .whereBetween('work_date', [startDate, endDate])
    .orderBy('work_date', 'desc')
    .orderBy('clock_in', 'desc');
}

export async function upsertClockIn(userId: string, workDate: string, clockInTime: string): Promise<AttendanceRecord> {
  const existing = await findTodayRecord(userId, workDate);
  if (existing) {
    const [record] = await db<AttendanceRecord>('attendance_records')
      .where({ id: existing.id })
      .update({ clock_in: clockInTime as any, updated_at: db.fn.now() })
      .returning('*');
    return record;
  }
  const [record] = await db<AttendanceRecord>('attendance_records')
    .insert({ user_id: userId, work_date: workDate, clock_in: clockInTime as any, status: 'active' })
    .returning('*');
  return record;
}

export async function updateClockOut(userId: string, workDate: string, clockOutTime: string): Promise<AttendanceRecord | undefined> {
  const existing = await findTodayRecord(userId, workDate);
  if (existing) {
    const diffMs = new Date(clockOutTime).getTime() - new Date(existing.clock_in).getTime();
    const durationMins = diffMs > 0 ? Math.round(diffMs / 60000) : null;
    const [record] = await db<AttendanceRecord>('attendance_records')
      .where({ id: existing.id })
      .update({ clock_out: clockOutTime as any, duration_mins: durationMins, status: 'completed', updated_at: db.fn.now() })
      .returning('*');
    return record;
  }
  // No clock_in record — insert with only clock_out, duration_mins null
  const [record] = await db<AttendanceRecord>('attendance_records')
    .insert({ user_id: userId, work_date: workDate, clock_in: clockOutTime as any, clock_out: clockOutTime as any, status: 'completed', duration_mins: null })
    .returning('*');
  return record;
}

export async function listAllRecords(
  startDate: string,
  endDate: string,
): Promise<(AttendanceRecord & { full_name: string; employee_id: string })[]> {
  return db('attendance_records as a')
    .join('users as u', 'a.user_id', 'u.id')
    .whereBetween('a.work_date', [startDate, endDate])
    .select(
      'a.*',
      'u.full_name',
      'u.employee_id',
    )
    .orderBy('a.work_date', 'desc')
    .orderBy('u.full_name');
}
