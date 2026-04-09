import { db } from '../config/database';
import { AttendanceRecord } from '../types';

export async function findTodayRecord(userId: string, workDate: string): Promise<AttendanceRecord | undefined> {
  return db<AttendanceRecord>('attendance_records')
    .where({ user_id: userId, work_date: workDate })
    .whereIn('status', ['active', 'completed'])
    .orderBy('clock_in', 'desc')
    .first();
}

export async function clockIn(userId: string, workDate: string, ipAddress: string): Promise<AttendanceRecord> {
  const [record] = await db<AttendanceRecord>('attendance_records')
    .insert({
      user_id: userId,
      clock_in: db.fn.now(),
      work_date: workDate,
      status: 'active',
      ip_address: ipAddress,
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
