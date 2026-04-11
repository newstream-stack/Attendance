import { listLeaveTypes, findLeaveTypeById, createLeaveType, updateLeaveType } from '../repositories/leaveType.repository';
import { getBalances, getBalance, upsertBalance, deductBalance, restoreBalance, adjustBalance, listAllWithUsers, accumulateBalance } from '../repositories/leaveBalance.repository';
import {
  createLeaveRequest, findLeaveRequestById, listMyRequests,
  listPendingForApprover, updateRequestStatus, createApproval, CreateLeaveRequestData,
} from '../repositories/leaveRequest.repository';
import { listUsers } from '../repositories/user.repository';
import { calculateWorkingMinutes } from '../utils/workingDays';
import { calcAnnualLeaveDays, daysToMins } from '../utils/annualLeave';
import { AppError } from '../middleware/errorHandler';
import { LeaveType } from '../types';

// ─── Leave Types ─────────────────────────────────────────────────────────────

export async function getLeaveTypes(activeOnly = true) {
  return listLeaveTypes(activeOnly);
}

export async function createNewLeaveType(data: Omit<LeaveType, 'id'>) {
  return createLeaveType(data);
}

export async function editLeaveType(id: string, data: Partial<Omit<LeaveType, 'id'>>) {
  const lt = await findLeaveTypeById(id);
  if (!lt) throw new AppError(404, '假別不存在');
  return updateLeaveType(id, data);
}

// ─── Leave Balances ───────────────────────────────────────────────────────────

export async function getMyBalances(userId: string, year: number) {
  const balances = await getBalances(userId, year);
  const types = await listLeaveTypes(false);
  return balances.map((b) => ({
    ...b,
    leave_type: types.find((t) => t.id === b.leave_type_id),
  }));
}

/** Allocate annual leave for a single user for the given year (accumulates on top of existing) */
export async function allocateAnnualForUser(userId: string, hireDate: string, year: number) {
  const annualType = (await listLeaveTypes(true)).find((t) => t.code === 'annual');
  if (!annualType) throw new AppError(500, '找不到年假假別');

  const days = calcAnnualLeaveDays(hireDate, new Date(`${year}-01-01`));
  if (days === 0) return; // not yet eligible
  const mins = daysToMins(days);
  await accumulateBalance(userId, annualType.id, year, mins);
}

/** Batch allocate annual leave for all active users (accumulates) */
export async function allocateAnnualAll(year: number) {
  const users = await listUsers();
  const active = users.filter((u) => u.is_active && !u.deleted_at);
  await Promise.all(active.map((u) => allocateAnnualForUser(u.id, u.hire_date, year)));
  return { allocated: active.length };
}

/** Preview annual leave allocation (no DB write) */
export async function previewAnnualLeave(year: number) {
  const users = await listUsers();
  const active = users.filter((u) => u.is_active && !u.deleted_at);
  const annualType = (await listLeaveTypes(false)).find((t) => t.code === 'annual');
  if (!annualType) throw new AppError(500, '找不到年假假別');

  const allBalances = await listAllWithUsers(year, annualType.id);

  return active.map((u) => {
    const existing = allBalances.find((b) => b.user_id === u.id);
    const statutory_days = calcAnnualLeaveDays(u.hire_date, new Date(`${year}-01-01`));
    const allocated_mins = existing?.allocated_mins ?? 0;
    const used_mins = existing?.used_mins ?? 0;
    const carried_mins = existing?.carried_mins ?? 0;
    const adjusted_mins = existing?.adjusted_mins ?? 0;
    const remaining_mins = allocated_mins + carried_mins + adjusted_mins - used_mins;
    return {
      user_id: u.id,
      employee_id: u.employee_id,
      full_name: u.full_name,
      department: u.department ?? null,
      hire_date: u.hire_date,
      balance_id: existing?.id ?? null,
      statutory_days,
      allocated_mins,
      used_mins,
      carried_mins,
      adjusted_mins,
      remaining_mins,
    };
  });
}

/** Get all employees' annual leave balances for admin */
export async function getAllAnnualBalances(year: number) {
  const annualType = (await listLeaveTypes(false)).find((t) => t.code === 'annual');
  if (!annualType) throw new AppError(500, '找不到年假假別');
  return listAllWithUsers(year, annualType.id);
}

export async function adjustLeaveBalance(balanceId: string, adjustedMins: number) {
  return adjustBalance(balanceId, adjustedMins);
}

// ─── Leave Requests ───────────────────────────────────────────────────────────

export async function submitLeaveRequest(data: {
  userId: string;
  leaveTypeId: string;
  workProxyUserId?: string | null;
  startTime: Date;
  endTime: Date;
  halfDay: boolean;
  halfDayPeriod?: string | null;
  reason?: string | null;
}) {
  const leaveType = await findLeaveTypeById(data.leaveTypeId);
  if (!leaveType || !leaveType.is_active) throw new AppError(400, '無效的假別');

  const durationMins = await calculateWorkingMinutes(data.startTime, data.endTime, data.halfDay);
  if (durationMins <= 0) throw new AppError(400, '請假時間不得為 0（請確認日期區間非假日）');

  // Check balance if required
  if (leaveType.requires_balance) {
    const year = data.startTime.getFullYear();
    const balance = await getBalance(data.userId, data.leaveTypeId, year);
    if (!balance) throw new AppError(400, `${leaveType.name_zh}額度不足（尚未配發）`);
    const available = balance.allocated_mins + balance.carried_mins + balance.adjusted_mins - balance.used_mins;
    if (available < durationMins) {
      throw new AppError(400, `${leaveType.name_zh}餘額不足（需 ${durationMins / 60}h，剩 ${available / 60}h）`);
    }
  }

  const payload: CreateLeaveRequestData = {
    user_id: data.userId,
    leave_type_id: data.leaveTypeId,
    work_proxy_user_id: data.workProxyUserId ?? null,
    start_time: data.startTime,
    end_time: data.endTime,
    duration_mins: durationMins,
    half_day: data.halfDay,
    half_day_period: data.halfDayPeriod ?? null,
    reason: data.reason ?? null,
  };

  return createLeaveRequest(payload);
}

export async function getMyLeaveRequests(userId: string) {
  return listMyRequests(userId);
}

export async function getPendingForApprover(approverId: string, isAdmin: boolean) {
  return listPendingForApprover(approverId, isAdmin);
}

export async function approveLeaveRequest(requestId: string, approverId: string, comment?: string) {
  const req = await findLeaveRequestById(requestId);
  if (!req) throw new AppError(404, '找不到請假申請');
  if (req.status !== 'pending') throw new AppError(400, '此申請已處理');

  await updateRequestStatus(requestId, 'approved');
  await createApproval({ leave_request_id: requestId, approver_id: approverId, level: 1, action: 'approved', comment });

  // Deduct balance if needed
  const leaveType = await findLeaveTypeById(req.leave_type_id);
  if (leaveType?.requires_balance) {
    const year = new Date(req.start_time).getFullYear();
    const balance = await getBalance(req.user_id, req.leave_type_id, year);
    if (balance) await deductBalance(balance.id, req.duration_mins);
  }
}

export async function rejectLeaveRequest(requestId: string, approverId: string, comment?: string) {
  const req = await findLeaveRequestById(requestId);
  if (!req) throw new AppError(404, '找不到請假申請');
  if (req.status !== 'pending') throw new AppError(400, '此申請已處理');

  await updateRequestStatus(requestId, 'rejected');
  await createApproval({ leave_request_id: requestId, approver_id: approverId, level: 1, action: 'rejected', comment });
}

export async function cancelLeaveRequest(requestId: string, userId: string) {
  const req = await findLeaveRequestById(requestId);
  if (!req) throw new AppError(404, '找不到請假申請');
  if (req.user_id !== userId) throw new AppError(403, '無權操作');
  if (!['pending', 'approved'].includes(req.status)) throw new AppError(400, '此申請無法取消');

  // Restore balance if was approved and requires_balance
  if (req.status === 'approved') {
    const leaveType = await findLeaveTypeById(req.leave_type_id);
    if (leaveType?.requires_balance) {
      const year = new Date(req.start_time).getFullYear();
      const balance = await getBalance(req.user_id, req.leave_type_id, year);
      if (balance) await restoreBalance(balance.id, req.duration_mins);
    }
  }

  await updateRequestStatus(requestId, 'cancelled');
}
