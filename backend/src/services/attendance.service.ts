import { findAllowedIpByAddress } from '../repositories/allowedIp.repository';
import {
  findTodayRecord, clockIn, clockOut, listRecords, listAllRecords,
} from '../repositories/attendance.repository';
import { getSettings } from '../repositories/systemSettings.repository';
import { findUserById } from '../repositories/user.repository';
import { findDispatchDateByDate } from '../repositories/dispatchDates.repository';
import { listSchedules } from '../repositories/dispatchSchedules.repository';
import { findCompMorningDateByDate, listCompMorningDatesByRange } from '../repositories/compMorningDates.repository';
import { listCompMorningSchedules } from '../repositories/compMorningSchedules.repository';
import { deductLunchBreak } from '../utils/workingDays';
import { AppError } from '../middleware/errorHandler';

const COMP_MORNING_START_MINS = 13 * 60 + 30; // 13:30

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

  // Late detection: compare current Taipei time against expected start time + tolerance
  const [user, settings] = await Promise.all([findUserById(userId), getSettings()]);
  const now = new Date();
  const taipeiNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  const nowMins = taipeiNow.getHours() * 60 + taipeiNow.getMinutes();

  let startMins: number;

  // 補休早上：特定日期 → 週排程 → 其他規則，13:30 起算
  const [compMorning, compMorningSchedules] = await Promise.all([
    findCompMorningDateByDate(userId, workDate),
    listCompMorningSchedules(userId),
  ]);
  const todayDowForComp = taipeiNow.getDay();
  const compMorningBySchedule = compMorningSchedules.find(
    s => s.days_of_week.split(',').map(Number).includes(todayDowForComp),
  );
  if (compMorning || compMorningBySchedule) {
    startMins = COMP_MORNING_START_MINS + settings.late_tolerance_mins;
  } else if (user?.is_special_dispatch) {
    // 1. 優先查個別例外日的時間
    const dispatchDate = await findDispatchDateByDate(userId, workDate);
    if (dispatchDate?.clock_in_time) {
      const [dh, dm] = dispatchDate.clock_in_time.split(':').map(Number);
      startMins = dh * 60 + dm + settings.late_tolerance_mins;
    } else {
      // 2. Fallback：查固定排程中今天是週幾的時間
      const todayDow = taipeiNow.getDay();
      const schedules = await listSchedules(userId);
      const matched = schedules.find(s => s.days_of_week.split(',').map(Number).includes(todayDow));
      if (matched) {
        const [dh, dm] = matched.clock_in_time.split(':').map(Number);
        startMins = dh * 60 + dm + settings.late_tolerance_mins;
      } else {
        // 非預期出勤日 → 不計遲到
        startMins = nowMins + 1;
      }
    }
  } else {
    const [sh, sm] = settings.work_start_time.split(':').map(Number);
    startMins = sh * 60 + sm + settings.late_tolerance_mins;
  }

  const isLate = (user?.track_attendance !== false) && nowMins > startMins;

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
  const [records, settings, user, compMorningRows, compMorningSchedules] = await Promise.all([
    listRecords(userId, startDate, endDate),
    getSettings(),
    findUserById(userId),
    listCompMorningDatesByRange(userId, startDate, endDate),
    listCompMorningSchedules(userId),
  ]);

  const trackAttendance = user?.track_attendance !== false;

  const compMorningSet = new Set(compMorningRows.map(r => r.work_date));

  // 判斷某日期是否在補休早上週排程中
  const isCompMorningDay = (workDate: string): boolean => {
    if (compMorningSet.has(workDate)) return true;
    const dow = new Date(workDate + 'T00:00:00').getDay();
    return compMorningSchedules.some(s => s.days_of_week.split(',').map(Number).includes(dow));
  };

  const [sh, sm] = settings.work_start_time.split(':').map(Number);
  const defaultStartMins = sh * 60 + sm + settings.late_tolerance_mins;
  const [eh, em] = settings.work_end_time.split(':').map(Number);
  const endMins = eh * 60 + em;

  return records.map((r) => {
    let late_mins: number | null = null;
    let early_leave_mins: number | null = null;

    if (trackAttendance) {
      const clockInMins = toTaipeiMinutes(r.clock_in);
      const isComp = isCompMorningDay(r.work_date);
      const effectiveStartMins = isComp
        ? COMP_MORNING_START_MINS + settings.late_tolerance_mins
        : defaultStartMins;
      const lateOffset = clockInMins - effectiveStartMins;
      late_mins = lateOffset > 0 ? lateOffset : null;

      if (r.clock_out) {
        // 補休早上日期下午才上班，不計早退
        if (!isComp) {
          const diff = endMins - toTaipeiMinutes(r.clock_out);
          early_leave_mins = diff > 0 ? diff : null;
        }
      }
    }

    return { ...r, duration_mins: recomputeDuration(r), late_mins, early_leave_mins };
  });
}

export async function getAllHistory(startDate: string, endDate: string) {
  const records = await listAllRecords(startDate, endDate);
  return records.map((r) => ({ ...r, duration_mins: recomputeDuration(r) }));
}
