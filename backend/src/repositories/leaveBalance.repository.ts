import { db } from '../config/database';
import { LeaveBalance } from '../types';

export interface CompBalanceRow {
  user_id: string;
  employee_id: string;
  full_name: string;
  department: string | null;
  balance_id: string | null;
  allocated_mins: number;
  used_mins: number;
  carried_mins: number;
  adjusted_mins: number;
  remaining_mins: number;
}

export async function getBalances(userId: string, year: number): Promise<LeaveBalance[]> {
  return db<LeaveBalance>('leave_balances').where({ user_id: userId, year });
}

export async function getAllBalances(userId: string): Promise<LeaveBalance[]> {
  return db<LeaveBalance>('leave_balances').where({ user_id: userId });
}

export async function getBalance(userId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | undefined> {
  return db<LeaveBalance>('leave_balances').where({ user_id: userId, leave_type_id: leaveTypeId, year }).first();
}

export async function upsertBalance(
  userId: string, leaveTypeId: string, year: number, allocatedMins: number,
): Promise<void> {
  await db('leave_balances')
    .insert({ user_id: userId, leave_type_id: leaveTypeId, year, allocated_mins: allocatedMins })
    .onConflict(['user_id', 'leave_type_id', 'year'])
    .merge({ allocated_mins: allocatedMins });
}

export async function deductBalance(id: string, mins: number): Promise<void> {
  await db('leave_balances').where({ id }).increment('used_mins', mins);
}

export async function restoreBalance(id: string, mins: number): Promise<void> {
  await db('leave_balances').where({ id }).decrement('used_mins', mins);
}

export async function adjustBalance(id: string, adjustedMins: number): Promise<LeaveBalance> {
  const [row] = await db<LeaveBalance>('leave_balances')
    .where({ id }).update({ adjusted_mins: adjustedMins }).returning('*');
  return row;
}

export async function addBalance(id: string, mins: number): Promise<void> {
  await db('leave_balances').where({ id }).increment('allocated_mins', mins);
}

export interface BalanceWithUser {
  id: string;
  user_id: string;
  employee_id: string;
  full_name: string;
  department: string | null;
  hire_date: string;
  leave_type_id: string;
  year: number;
  allocated_mins: number;
  used_mins: number;
  carried_mins: number;
  adjusted_mins: number;
}

export async function listAllWithUsers(year: number, leaveTypeId: string): Promise<BalanceWithUser[]> {
  return db('leave_balances as lb')
    .join('users as u', 'lb.user_id', 'u.id')
    .where({ 'lb.year': year, 'lb.leave_type_id': leaveTypeId })
    .whereNull('u.deleted_at')
    .select(
      'lb.id', 'lb.user_id', 'lb.leave_type_id', 'lb.year',
      'lb.allocated_mins', 'lb.used_mins', 'lb.carried_mins', 'lb.adjusted_mins',
      'u.employee_id', 'u.full_name', 'u.department', 'u.hire_date',
    )
    .orderBy('u.employee_id');
}

/** Insert or ADD to existing allocated_mins (never replaces) */
export async function accumulateBalance(
  userId: string, leaveTypeId: string, year: number, additionalMins: number,
): Promise<void> {
  await db('leave_balances')
    .insert({ user_id: userId, leave_type_id: leaveTypeId, year, allocated_mins: additionalMins })
    .onConflict(['user_id', 'leave_type_id', 'year'])
    .merge({ allocated_mins: db.raw('leave_balances.allocated_mins + ?', [additionalMins]) });
}

/** Set allocated_mins directly (creates row if not exists) */
export async function setAllocatedBalance(
  userId: string, leaveTypeId: string, year: number, allocatedMins: number,
): Promise<LeaveBalance> {
  const [row] = await db<LeaveBalance>('leave_balances')
    .insert({ user_id: userId, leave_type_id: leaveTypeId, year, allocated_mins: allocatedMins })
    .onConflict(['user_id', 'leave_type_id', 'year'])
    .merge({ allocated_mins: allocatedMins })
    .returning('*');
  return row;
}

/** Upsert adjusted_mins for a balance row (creates row if not exists) */
export async function upsertAdjustedBalance(
  userId: string, leaveTypeId: string, year: number, adjustedMins: number,
): Promise<LeaveBalance> {
  const [row] = await db<LeaveBalance>('leave_balances')
    .insert({ user_id: userId, leave_type_id: leaveTypeId, year, adjusted_mins: adjustedMins })
    .onConflict(['user_id', 'leave_type_id', 'year'])
    .merge({ adjusted_mins: adjustedMins })
    .returning('*');
  return row;
}
