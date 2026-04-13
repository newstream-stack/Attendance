import { db } from '../config/database';
import { User } from '../types';

export interface CreateUserData {
  employee_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
  department?: string;
  position?: string;
  hire_date: string;
  manager_id?: string | null;
}

export interface UpdateUserData {
  employee_id?: string;
  email?: string;
  full_name?: string;
  role?: string;
  department?: string | null;
  position?: string | null;
  hire_date?: string;
  manager_id?: string | null;
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  return db<User>('users')
    .where({ email })
    .whereNull('deleted_at')
    .first();
}

export async function findUserByEmployeeId(employeeId: string): Promise<User | undefined> {
  return db<User>('users')
    .where({ employee_id: employeeId })
    .whereNull('deleted_at')
    .first();
}

export async function findUserById(id: string): Promise<User | undefined> {
  return db<User>('users')
    .where({ id, is_active: true })
    .whereNull('deleted_at')
    .first();
}

export async function updatePassword(userId: string, newHash: string): Promise<void> {
  await db('users')
    .where({ id: userId })
    .update({ password_hash: newHash, must_change_password: false, updated_at: db.fn.now() });
}

export async function setResetToken(userId: string, token: string, expires: Date): Promise<void> {
  await db('users')
    .where({ id: userId })
    .update({ password_reset_token: token, password_reset_expires: expires, updated_at: db.fn.now() });
}

export async function findUserByResetToken(token: string): Promise<User | undefined> {
  return db<User>('users')
    .where({ password_reset_token: token, is_active: true })
    .whereNull('deleted_at')
    .where('password_reset_expires', '>', db.fn.now())
    .first();
}

export async function clearResetToken(userId: string): Promise<void> {
  await db('users')
    .where({ id: userId })
    .update({ password_reset_token: null, password_reset_expires: null, updated_at: db.fn.now() });
}

export async function listUsers(): Promise<User[]> {
  return db<User>('users')
    .whereNull('deleted_at')
    .orderBy('created_at', 'asc');
}

export async function createUser(data: CreateUserData): Promise<User> {
  const [user] = await db<User>('users')
    .insert({
      employee_id: data.employee_id,
      email: data.email,
      password_hash: data.password_hash,
      full_name: data.full_name,
      role: data.role as any,
      department: data.department ?? null,
      position: data.position ?? null,
      hire_date: data.hire_date,
      manager_id: data.manager_id ?? null,
      must_change_password: true,
    })
    .returning('*');
  return user;
}

export async function updateUser(id: string, data: UpdateUserData): Promise<User> {
  const updates: Record<string, unknown> = { updated_at: db.fn.now() };
  if (data.employee_id !== undefined) updates.employee_id = data.employee_id;
  if (data.email !== undefined) updates.email = data.email;
  if (data.full_name !== undefined) updates.full_name = data.full_name;
  if (data.role !== undefined) updates.role = data.role;
  if (data.department !== undefined) updates.department = data.department;
  if (data.position !== undefined) updates.position = data.position;
  if (data.hire_date !== undefined) updates.hire_date = data.hire_date;
  if (data.manager_id !== undefined) updates.manager_id = data.manager_id;

  const [user] = await db<User>('users')
    .where({ id })
    .update(updates)
    .returning('*');
  return user;
}

export async function softDeleteUser(id: string): Promise<void> {
  await db('users')
    .where({ id })
    .update({ deleted_at: db.fn.now(), is_active: false, updated_at: db.fn.now() });
}

export async function setUserActive(id: string, isActive: boolean): Promise<void> {
  await db('users')
    .where({ id })
    .update({ is_active: isActive, updated_at: db.fn.now() });
}

export async function listManagers(): Promise<Pick<User, 'id' | 'full_name' | 'employee_id'>[]> {
  return db<User>('users')
    .whereIn('role', ['admin', 'manager'])
    .where({ is_active: true })
    .whereNull('deleted_at')
    .select('id', 'full_name', 'employee_id')
    .orderBy('full_name');
}
