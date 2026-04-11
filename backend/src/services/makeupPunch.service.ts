import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import {
  getRules as repoGetRules, updateRules as repoUpdateRules,
  createRequest, findRequestById,
  listRequestsByUser, listAllRequests, listPendingRequests,
  updateRequestStatus, findDuplicateRequest,
  CreateMakeupPunchData,
} from '../repositories/makeupPunch.repository';
import { upsertClockIn, updateClockOut } from '../repositories/attendance.repository';

// ─── Rules ───────────────────────────────────────────────────────────────────

export async function getRules() {
  return repoGetRules();
}

export async function updateRules(data: { deadline_working_days?: number; reason_required?: boolean }) {
  return repoUpdateRules(data);
}

// ─── Deadline Calculation ─────────────────────────────────────────────────────

/** Returns the deadline Date (end of the Nth working day after workDate) */
async function calcDeadline(workDate: string, deadlineDays: number): Promise<Date> {
  const start = new Date(workDate + 'T00:00:00');
  start.setDate(start.getDate() + 1); // start from next day

  // Fetch holidays for a reasonable window (workDate year + next year)
  const year = new Date(workDate).getFullYear();
  const holidays = await db('public_holidays')
    .whereBetween('year', [year, year + 1])
    .select('holiday_date')
    .then((rows: { holiday_date: string | Date }[]) =>
      new Set(rows.map((r) => new Date(r.holiday_date).toLocaleDateString('en-CA')))
    );

  let count = 0;
  const cur = new Date(start);
  while (count < deadlineDays) {
    const dayOfWeek = cur.getDay();
    const dateStr = cur.toLocaleDateString('en-CA');
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
      count++;
    }
    if (count < deadlineDays) cur.setDate(cur.getDate() + 1);
  }

  // Deadline is end of that working day (23:59:59)
  cur.setHours(23, 59, 59, 999);
  return cur;
}

// ─── Requests ─────────────────────────────────────────────────────────────────

export async function submitRequest(userId: string, data: {
  work_date: string;
  punch_type: 'clock_in' | 'clock_out';
  requested_time: string;
  reason?: string | null;
}) {
  const rules = await repoGetRules();

  // Deadline check
  const deadline = await calcDeadline(data.work_date, rules.deadline_working_days);
  if (new Date() > deadline) {
    throw new AppError(400, `補打卡申請已逾期，截止時間為 ${deadline.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`);
  }

  // reason_required check
  if (rules.reason_required && !data.reason?.trim()) {
    throw new AppError(400, '請填寫補打卡說明');
  }

  // Duplicate check
  const duplicate = await findDuplicateRequest(userId, data.work_date, data.punch_type);
  if (duplicate) {
    throw new AppError(409, '此日期已有相同類型的補打卡申請（待審或已核准）');
  }

  const payload: CreateMakeupPunchData = {
    user_id: userId,
    work_date: data.work_date,
    punch_type: data.punch_type,
    requested_time: data.requested_time,
    reason: data.reason ?? null,
  };

  return createRequest(payload);
}

export async function listMyRequests(userId: string) {
  return listRequestsByUser(userId);
}

export async function listAll() {
  return listAllRequests();
}

export async function listPending() {
  return listPendingRequests();
}

export async function approveRequest(id: string, adminId: string, comment?: string | null) {
  const req = await findRequestById(id);
  if (!req) throw new AppError(404, '找不到補打卡申請');
  if (req.status !== 'pending') throw new AppError(400, '此申請已處理');

  await updateRequestStatus(id, 'approved', adminId, comment);

  // Update attendance_records
  const dateStr = typeof req.work_date === 'string' ? req.work_date : new Date(req.work_date).toLocaleDateString('en-CA');
  // Build full timestamp from work_date + requested_time (assume Taipei)
  const clockTime = `${dateStr}T${req.requested_time}+08:00`;

  if (req.punch_type === 'clock_in') {
    await upsertClockIn(req.user_id, dateStr, clockTime);
  } else {
    await updateClockOut(req.user_id, dateStr, clockTime);
  }
}

export async function rejectRequest(id: string, adminId: string, comment?: string | null) {
  const req = await findRequestById(id);
  if (!req) throw new AppError(404, '找不到補打卡申請');
  if (req.status !== 'pending') throw new AppError(400, '此申請已處理');

  await updateRequestStatus(id, 'rejected', adminId, comment);
}

export async function cancelRequest(id: string, userId: string) {
  const req = await findRequestById(id);
  if (!req) throw new AppError(404, '找不到補打卡申請');
  if (req.user_id !== userId) throw new AppError(403, '無權操作');
  if (req.status !== 'pending') throw new AppError(400, '只能取消待審中的申請');

  await updateRequestStatus(id, 'cancelled');
}
