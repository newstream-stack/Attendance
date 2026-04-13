import { findAllowedIpByAddress } from '../repositories/allowedIp.repository';
import {
  findTodayRecord, clockIn, clockOut, listRecords, listAllRecords,
} from '../repositories/attendance.repository';
import { getSettings } from '../repositories/systemSettings.repository';
import { deductLunchBreak } from '../utils/workingDays';
import { AppError } from '../middleware/errorHandler';

function getTaipeiDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }); // YYYY-MM-DD
}

function toTaipeiMinutes(ts: Date | string): number {
  const d = new Date(new Date(ts).toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  return d.getHours() * 60 + d.getMinutes();
}

function recomputeDuration(record: { clock_in: Date | string; clock_out: Date | string | null; duration_mins: number | null }) {
  if (!record.clock_out) return record.duration_mins;
  const startMins = toTaipeiMinutes(record.clock_in);
  const endMins = toTaipeiMinutes(record.clock_out);
  const mins = deductLunchBreak(startMins, endMins);
  return mins > 0 ? mins : record.duration_mins;
}

export async function clockInService(userId: string, ipAddress: string) {
  // IP whitelist check
  const allowed = await findAllowedIpByAddress(ipAddress);
  if (!allowed) throw new AppError(403, `此 IP（${ipAddress}）不允許打卡`);

  const workDate = getTaipeiDateString();
  const existing = await findTodayRecord(userId, workDate);
  if (existing) throw new AppError(409, '今日已打卡上班');

  // Late detection: compare current Taipei time against work_start_time + tolerance
  const settings = await getSettings();
  const now = new Date();
  const taipeiNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  const nowMins = taipeiNow.getHours() * 60 + taipeiNow.getMinutes();
  const [sh, sm] = settings.work_start_time.split(':').map(Number);
  const startMins = sh * 60 + sm + settings.late_tolerance_mins;
  const isLate = nowMins > startMins;

  return clockIn(userId, workDate, ipAddress, isLate);
}

export async function clockOutService(userId: string) {
  const workDate = getTaipeiDateString();
  const record = await findTodayRecord(userId, workDate);

  if (!record) throw new AppError(404, '找不到今日打卡紀錄');
  if (record.status === 'completed') throw new AppError(409, '今日已打卡下班');

  const startMins = toTaipeiMinutes(record.clock_in);
  const endMins = toTaipeiMinutes(new Date());
  const durationMins = deductLunchBreak(startMins, endMins);

  return clockOut(record.id, durationMins);
}

export async function getTodayRecord(userId: string) {
  const workDate = getTaipeiDateString();
  const record = await findTodayRecord(userId, workDate);
  if (!record) return record;
  return { ...record, duration_mins: recomputeDuration(record) };
}

export async function getMyHistory(userId: string, startDate: string, endDate: string) {
  const [records, settings] = await Promise.all([
    listRecords(userId, startDate, endDate),
    getSettings(),
  ]);

  const [sh, sm] = settings.work_start_time.split(':').map(Number);
  const startMins = sh * 60 + sm + settings.late_tolerance_mins;
  const [eh, em] = settings.work_end_time.split(':').map(Number);
  const endMins = eh * 60 + em;

  return records.map((r) => {
    const clockInMins = toTaipeiMinutes(r.clock_in);
    const lateOffset = clockInMins - startMins;
    const late_mins = lateOffset > 0 ? lateOffset : null;

    let early_leave_mins: number | null = null;
    if (r.clock_out) {
      const diff = endMins - toTaipeiMinutes(r.clock_out);
      early_leave_mins = diff > 0 ? diff : null;
    }

    return { ...r, duration_mins: recomputeDuration(r), late_mins, early_leave_mins };
  });
}

export async function getAllHistory(startDate: string, endDate: string) {
  const records = await listAllRecords(startDate, endDate);
  return records.map((r) => ({ ...r, duration_mins: recomputeDuration(r) }));
}
