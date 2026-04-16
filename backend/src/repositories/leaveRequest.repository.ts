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
  proxy_status?: string | null;
  attachment_path?: string | null;
}

export async function createLeaveRequest(data: CreateLeaveRequestData): Promise<LeaveRequest> {
  const [row] = await db<LeaveRequest>('leave_requests').insert(data as any).returning('*');
  return row;
}

export async function findLeaveRequestById(id: string): Promise<LeaveRequest | undefined> {
  return db<LeaveRequest>('leave_requests').where({ id }).first();
}

export async function listMyRequests(userId: string): Promise<(LeaveRequest & { leave_type_name: string; leave_type_requires_attachment: boolean })[]> {
  return db('leave_requests as lr')
    .join('leave_types as lt', 'lr.leave_type_id', 'lt.id')
    .where('lr.user_id', userId)
    .select('lr.*', 'lt.name_zh as leave_type_name', 'lt.requires_attachment as leave_type_requires_attachment')
    .orderBy('lr.created_at', 'desc');
}

export async function listPendingForApprover(approverId: string, isAdmin: boolean): Promise<(LeaveRequest & {
  leave_type_name: string; applicant_name: string; employee_id: string;
})[]> {
  const q = db('leave_requests as lr')
    .join('leave_types as lt', 'lr.leave_type_id', 'lt.id')
    .join('users as u', 'lr.user_id', 'u.id')
    .where('lr.status', 'pending')
    // Only show after proxy has approved (or no proxy required)
    .where(function () {
      this.whereNull('lr.proxy_status').orWhere('lr.proxy_status', 'approved');
    })
    .select('lr.*', 'lt.name_zh as leave_type_name', 'u.full_name as applicant_name', 'u.employee_id')
    .orderBy('lr.submitted_at', 'asc');
  if (!isAdmin) q.where('u.manager_id', approverId);
  return q;
}

export async function listPendingProxyRequests(proxyUserId: string): Promise<(LeaveRequest & {
  leave_type_name: string; applicant_name: string; employee_id: string;
})[]> {
  return db('leave_requests as lr')
    .join('leave_types as lt', 'lr.leave_type_id', 'lt.id')
    .join('users as u', 'lr.user_id', 'u.id')
    .where('lr.work_proxy_user_id', proxyUserId)
    .where('lr.proxy_status', 'pending')
    .select('lr.*', 'lt.name_zh as leave_type_name', 'u.full_name as applicant_name', 'u.employee_id')
    .orderBy('lr.submitted_at', 'asc');
}

export async function updateProxyStatus(
  id: string,
  status: string,
  comment?: string | null,
): Promise<LeaveRequest> {
  const [row] = await db<LeaveRequest>('leave_requests')
    .where({ id })
    .update({ proxy_status: status as any, proxy_comment: comment ?? null, proxy_acted_at: db.fn.now(), updated_at: db.fn.now() })
    .returning('*');
  return row;
}

export async function updateRequestStatus(
  id: string,
  status: string,
): Promise<LeaveRequest> {
  const [row] = await db<LeaveRequest>('leave_requests')
    .where({ id })
    .update({ status: status as any, updated_at: db.fn.now() })
    .returning('*');
  return row;
}

export async function updateAttachmentPath(id: string, attachmentPath: string): Promise<void> {
  await db('leave_requests').where({ id }).update({ attachment_path: attachmentPath, updated_at: db.fn.now() });
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
