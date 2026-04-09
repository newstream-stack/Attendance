import { db } from '../config/database';
import { LeaveRequest } from '../types';

export interface CreateLeaveRequestData {
  user_id: string;
  leave_type_id: string;
  work_proxy_user_id?: string | null;
  start_time: Date;
  end_time: Date;
  duration_mins: number;
  half_day: boolean;
  half_day_period?: string | null;
  reason?: string | null;
}

export async function createLeaveRequest(data: CreateLeaveRequestData): Promise<LeaveRequest> {
  const [row] = await db<LeaveRequest>('leave_requests').insert(data).returning('*');
  return row;
}

export async function findLeaveRequestById(id: string): Promise<LeaveRequest | undefined> {
  return db<LeaveRequest>('leave_requests').where({ id }).first();
}

export async function listMyRequests(userId: string): Promise<(LeaveRequest & { leave_type_name: string })[]> {
  return db('leave_requests as lr')
    .join('leave_types as lt', 'lr.leave_type_id', 'lt.id')
    .where('lr.user_id', userId)
    .select('lr.*', 'lt.name_zh as leave_type_name')
    .orderBy('lr.created_at', 'desc');
}

export async function listPendingForApprover(approverId: string): Promise<(LeaveRequest & {
  leave_type_name: string; applicant_name: string; employee_id: string;
})[]> {
  return db('leave_requests as lr')
    .join('leave_types as lt', 'lr.leave_type_id', 'lt.id')
    .join('users as u', 'lr.user_id', 'u.id')
    .where('u.manager_id', approverId)
    .where('lr.status', 'pending')
    .select('lr.*', 'lt.name_zh as leave_type_name', 'u.full_name as applicant_name', 'u.employee_id')
    .orderBy('lr.submitted_at', 'asc');
}

export async function updateRequestStatus(
  id: string,
  status: string,
): Promise<LeaveRequest> {
  const [row] = await db<LeaveRequest>('leave_requests')
    .where({ id })
    .update({ status, updated_at: db.fn.now() })
    .returning('*');
  return row;
}

export async function createApproval(data: {
  leave_request_id: string;
  approver_id: string;
  level: number;
  action: string;
  comment?: string | null;
}): Promise<void> {
  await db('leave_approvals').insert(data);
}
