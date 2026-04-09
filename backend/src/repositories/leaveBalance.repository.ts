import { db } from '../config/database';
import { LeaveBalance } from '../types';

export async function getBalances(userId: string, year: number): Promise<LeaveBalance[]> {
  return db<LeaveBalance>('leave_balances').where({ user_id: userId, year });
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
