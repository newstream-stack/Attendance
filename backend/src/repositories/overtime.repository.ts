import { db } from '../config/database';
import { OvertimeRequest } from '../types';

export interface CreateOvertimeData {
  user_id: string;
  work_date: string;
  start_time: Date;
  end_time: Date;
  duration_mins: number;
  reason?: string | null;
  convert_to_comp: boolean;
}

export async function createOvertimeRequest(data: CreateOvertimeData): Promise<OvertimeRequest> {
  const [row] = await db<OvertimeRequest>('overtime_requests').insert(data).returning('*');
  return row;
}

export async function findOvertimeById(id: string): Promise<OvertimeRequest | undefined> {
  return db<OvertimeRequest>('overtime_requests').where({ id }).first();
}

export async function listMyOvertimeRequests(userId: string): Promise<OvertimeRequest[]> {
  return db<OvertimeRequest>('overtime_requests')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc');
}

export async function listPendingOvertimeForApprover(
  approverId: string,
  isAdmin: boolean,
): Promise<(OvertimeRequest & { full_name: string; employee_id: string })[]> {
  const q = db('overtime_requests as o')
    .join('users as u', 'o.user_id', 'u.id')
    .where('o.status', 'pending')
    .select('o.*', 'u.full_name', 'u.employee_id')
    .orderBy('o.submitted_at', 'asc');
  if (!isAdmin) q.where('u.manager_id', approverId);
  return q;
}

export async function updateOvertimeStatus(id: string, status: string): Promise<OvertimeRequest> {
  const [row] = await db<OvertimeRequest>('overtime_requests')
    .where({ id })
    .update({ status: status as any, updated_at: db.fn.now() })
    .returning('*');
  return row;
}

export async function createOvertimeApproval(data: {
  overtime_request_id: string;
  approver_id: string;
  action: string;
  comment?: string | null;
}): Promise<void> {
  await db('overtime_approvals').insert(data);
}
