import { db } from '../config/database';
import { MakeupPunchRules, MakeupPunchRequest, MakeupPunchStatus } from '../types';

// ─── Rules ───────────────────────────────────────────────────────────────────

export async function getRules(): Promise<MakeupPunchRules> {
  const row = await db<MakeupPunchRules>('makeup_punch_rules').where({ id: 1 }).first();
  return row!;
}

export async function updateRules(data: {
  deadline_working_days?: number;
  reason_required?: boolean;
}): Promise<MakeupPunchRules> {
  const [row] = await db<MakeupPunchRules>('makeup_punch_rules')
    .where({ id: 1 })
    .update({ ...data, updated_at: db.fn.now() })
    .returning('*');
  return row;
}

// ─── Requests ─────────────────────────────────────────────────────────────────

export interface CreateMakeupPunchData {
  user_id: string;
  work_date: string;
  punch_type: 'clock_in' | 'clock_out';
  requested_time: string;
  reason?: string | null;
}

export async function createRequest(data: CreateMakeupPunchData): Promise<MakeupPunchRequest> {
  const [row] = await db<MakeupPunchRequest>('makeup_punch_requests').insert(data).returning('*');
  return row;
}

export async function findRequestById(id: string): Promise<MakeupPunchRequest | undefined> {
  return db<MakeupPunchRequest>('makeup_punch_requests').where({ id }).first();
}

export async function listRequestsByUser(userId: string): Promise<(MakeupPunchRequest & { full_name: string; employee_id: string })[]> {
  return db('makeup_punch_requests as r')
    .join('users as u', 'r.user_id', 'u.id')
    .where('r.user_id', userId)
    .select('r.*', 'u.full_name', 'u.employee_id')
    .orderBy('r.created_at', 'desc');
}

export async function listAllRequests(): Promise<(MakeupPunchRequest & { full_name: string; employee_id: string })[]> {
  return db('makeup_punch_requests as r')
    .join('users as u', 'r.user_id', 'u.id')
    .select('r.*', 'u.full_name', 'u.employee_id')
    .orderBy('r.created_at', 'desc');
}

export async function listPendingRequests(): Promise<(MakeupPunchRequest & { full_name: string; employee_id: string })[]> {
  return db('makeup_punch_requests as r')
    .join('users as u', 'r.user_id', 'u.id')
    .where('r.status', 'pending')
    .select('r.*', 'u.full_name', 'u.employee_id')
    .orderBy('r.created_at', 'asc');
}

export async function updateRequestStatus(
  id: string,
  status: MakeupPunchStatus,
  reviewedBy?: string,
  comment?: string | null,
): Promise<MakeupPunchRequest> {
  const [row] = await db<MakeupPunchRequest>('makeup_punch_requests')
    .where({ id })
    .update({
      status,
      reviewed_by: reviewedBy ?? null,
      review_comment: comment ?? null,
      reviewed_at: reviewedBy ? db.fn.now() : null,
      updated_at: db.fn.now(),
    })
    .returning('*');
  return row;
}

export async function findDuplicateRequest(
  userId: string,
  workDate: string,
  punchType: 'clock_in' | 'clock_out',
): Promise<MakeupPunchRequest | undefined> {
  return db<MakeupPunchRequest>('makeup_punch_requests')
    .where({ user_id: userId, work_date: workDate, punch_type: punchType })
    .whereIn('status', ['pending', 'approved'])
    .first();
}
