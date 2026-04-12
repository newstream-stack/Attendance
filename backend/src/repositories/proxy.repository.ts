import { db } from '../config/database';
import { ProxyAssignment } from '../types';

export async function listMyProxies(principalId: string): Promise<(ProxyAssignment & { proxy_name: string })[]> {
  return db('proxy_assignments as p')
    .join('users as u', 'p.proxy_id', 'u.id')
    .where('p.principal_id', principalId)
    .select('p.*', 'u.full_name as proxy_name')
    .orderBy('p.created_at', 'desc');
}

export async function createProxy(data: {
  principal_id: string;
  proxy_id: string;
  start_date: string;
  end_date: string;
  scope: string;
  created_by: string;
}): Promise<ProxyAssignment> {
  const [row] = await db<ProxyAssignment>('proxy_assignments').insert(data as any).returning('*');
  return row;
}

export async function updateProxy(id: string, principalId: string, data: {
  start_date?: string;
  end_date?: string;
  scope?: string;
  is_active?: boolean;
}): Promise<ProxyAssignment> {
  const [row] = await db<ProxyAssignment>('proxy_assignments')
    .where({ id, principal_id: principalId })
    .update(data)
    .returning('*');
  return row;
}

export async function deleteProxy(id: string, principalId: string): Promise<void> {
  await db('proxy_assignments').where({ id, principal_id: principalId }).delete();
}

/** Find active proxy for a principal on a given date */
export async function findActiveProxy(principalId: string, date: string): Promise<ProxyAssignment | undefined> {
  return db<ProxyAssignment>('proxy_assignments')
    .where({ principal_id: principalId, is_active: true })
    .where('start_date', '<=', date)
    .where('end_date', '>=', date)
    .first();
}
