import { db } from '../config/database';
import { OutingRecord } from '../types';

export interface OutingRow extends OutingRecord {
  full_name: string;
  employee_id: string;
}

function baseQuery() {
  return db('outing_records as o')
    .join('users as u', 'o.user_id', 'u.id')
    .select(
      'o.*',
      'u.full_name',
      'u.employee_id',
    );
}

export async function createOuting(data: {
  user_id: string;
  outing_date: string;
  outing_time: string | null;
  outing_type: string | null;
  destination: string;
  note: string | null;
}): Promise<OutingRecord> {
  const [row] = await db<OutingRecord>('outing_records').insert(data).returning('*');
  return row;
}

export async function listMyOutings(userId: string): Promise<OutingRow[]> {
  return baseQuery()
    .where('o.user_id', userId)
    .orderBy('o.outing_date', 'desc');
}

export async function listOutingsByDate(date: string): Promise<OutingRow[]> {
  return baseQuery()
    .where('o.outing_date', date)
    .orderBy('u.employee_id');
}

export async function searchOutings(params: {
  user_id?: string;
  start?: string;
  end?: string;
}): Promise<OutingRow[]> {
  const q = baseQuery();
  if (params.user_id) {
    q.where('o.user_id', params.user_id);
  }
  if (params.start) {
    q.where('o.outing_date', '>=', params.start);
  }
  if (params.end) {
    q.where('o.outing_date', '<=', params.end);
  }
  return q.orderBy('o.outing_date', 'desc').orderBy('u.employee_id');
}

export async function deleteOuting(id: string, userId: string): Promise<OutingRecord | undefined> {
  const [row] = await db<OutingRecord>('outing_records')
    .where({ id, user_id: userId })
    .delete()
    .returning('*');
  return row;
}
