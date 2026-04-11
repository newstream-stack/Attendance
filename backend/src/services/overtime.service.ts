import {
  createOvertimeRequest, findOvertimeById, listMyOvertimeRequests,
  listPendingOvertimeForApprover, updateOvertimeStatus, createOvertimeApproval,
} from '../repositories/overtime.repository';
import { listLeaveTypes } from '../repositories/leaveType.repository';
import { getBalance, upsertBalance, addBalance } from '../repositories/leaveBalance.repository';
import { findUserById } from '../repositories/user.repository';
import { AppError } from '../middleware/errorHandler';
import { db } from '../config/database';
import { deductLunchBreak } from '../utils/workingDays';

export async function submitOvertimeRequest(data: {
  userId: string;
  workDate: string;
  startTime: Date;
  endTime: Date;
  reason?: string | null;
  convertToComp: boolean;
}) {
  if (data.endTime <= data.startTime) throw new AppError(400, '結束時間須晚於開始時間');

  // Deduct lunch break (12:30–13:30) from duration
  const toTaipeiMins = (d: Date) => {
    const local = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    return local.getHours() * 60 + local.getMinutes();
  };
  const startMins = toTaipeiMins(data.startTime);
  const endMins = toTaipeiMins(data.endTime);
  const durationMins = deductLunchBreak(startMins, endMins);
  if (durationMins < 30) throw new AppError(400, '加班時間至少 30 分鐘（扣除午休後）');

  return createOvertimeRequest({
    user_id: data.userId,
    work_date: data.workDate,
    start_time: data.startTime,
    end_time: data.endTime,
    duration_mins: durationMins,
    reason: data.reason ?? null,
    convert_to_comp: data.convertToComp,
  });
}

export async function getMyOvertimeRequests(userId: string) {
  return listMyOvertimeRequests(userId);
}

export async function getPendingOvertimeForApprover(approverId: string, isAdmin: boolean) {
  return listPendingOvertimeForApprover(approverId, isAdmin);
}

export async function approveOvertimeRequest(requestId: string, approverId: string, comment?: string) {
  const req = await findOvertimeById(requestId);
  if (!req) throw new AppError(404, '找不到加班申請');
  if (req.status !== 'pending') throw new AppError(400, '此申請已處理');

  // If convert_to_comp: credit comp leave balance (within transaction)
  if (req.convert_to_comp) {
    const compType = (await listLeaveTypes(false)).find((t) => t.code === 'comp');
    if (!compType) throw new AppError(500, '找不到補休假別');

    const user = await findUserById(req.user_id);
    if (!user) throw new AppError(404, '找不到員工');

    const year = new Date(req.start_time).getFullYear();
    await db.transaction(async (trx) => {
      // Upsert balance row (create if not exists)
      await trx('leave_balances')
        .insert({ user_id: req.user_id, leave_type_id: compType.id, year, allocated_mins: 0 })
        .onConflict(['user_id', 'leave_type_id', 'year'])
        .ignore();

      const balance = await trx('leave_balances')
        .where({ user_id: req.user_id, leave_type_id: compType.id, year })
        .first();

      await trx('leave_balances')
        .where({ id: balance.id })
        .increment('allocated_mins', req.duration_mins);

      await trx('overtime_requests')
        .where({ id: requestId })
        .update({ status: 'approved', updated_at: trx.fn.now() });

      await trx('overtime_approvals').insert({
        overtime_request_id: requestId, approver_id: approverId,
        action: 'approved', comment: comment ?? null,
      });
    });
  } else {
    await updateOvertimeStatus(requestId, 'approved');
    await createOvertimeApproval({ overtime_request_id: requestId, approver_id: approverId, action: 'approved', comment });
  }
}

export async function rejectOvertimeRequest(requestId: string, approverId: string, comment?: string) {
  const req = await findOvertimeById(requestId);
  if (!req) throw new AppError(404, '找不到加班申請');
  if (req.status !== 'pending') throw new AppError(400, '此申請已處理');

  await updateOvertimeStatus(requestId, 'rejected');
  await createOvertimeApproval({ overtime_request_id: requestId, approver_id: approverId, action: 'rejected', comment });
}

export async function cancelOvertimeRequest(requestId: string, userId: string) {
  const req = await findOvertimeById(requestId);
  if (!req) throw new AppError(404, '找不到加班申請');
  if (req.user_id !== userId) throw new AppError(403, '無權操作');
  if (req.status !== 'pending') throw new AppError(400, '僅能取消待審核的申請');

  await updateOvertimeStatus(requestId, 'cancelled');
}
