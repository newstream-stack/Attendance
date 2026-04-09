import { db } from '../config/database';
import { LeaveType } from '../types';

export async function listLeaveTypes(activeOnly = true): Promise<LeaveType[]> {
  const q = db<LeaveType>('leave_types').orderBy('name_zh');
  if (activeOnly) q.where({ is_active: true });
  return q;
}

export async function findLeaveTypeById(id: string): Promise<LeaveType | undefined> {
  return db<LeaveType>('leave_types').where({ id }).first();
}

export async function createLeaveType(data: Omit<LeaveType, 'id'>): Promise<LeaveType> {
  const [row] = await db<LeaveType>('leave_types').insert(data).returning('*');
  return row;
}

export async function updateLeaveType(id: string, data: Partial<Omit<LeaveType, 'id'>>): Promise<LeaveType> {
  const [row] = await db<LeaveType>('leave_types').where({ id }).update(data).returning('*');
  return row;
}
