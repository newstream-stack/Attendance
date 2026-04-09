import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  listUsers, createUser, updateUser, updatePassword, setUserActive, softDeleteUser, listManagers,
  findUserById, UpdateUserData,
} from '../repositories/user.repository';
import { sendWelcomeEmail } from '../utils/email';
import { AppError } from '../middleware/errorHandler';
import { findUserByEmail, findUserByEmployeeId } from '../repositories/user.repository';
import { db } from '../config/database';

export async function getUsers() {
  const users = await listUsers();
  return users.map(({ password_hash, password_reset_token, password_reset_expires, ...u }) => u);
}

export async function getManagers() {
  return listManagers();
}

export async function createNewUser(data: {
  employee_id: string;
  email: string;
  full_name: string;
  role: string;
  department?: string;
  position?: string;
  hire_date: string;
  manager_id?: string | null;
}) {
  const existingById = await findUserByEmployeeId(data.employee_id);
  if (existingById) throw new AppError(409, '此員工編號已被使用');

  const existing = await findUserByEmail(data.email);
  if (existing) throw new AppError(409, '此 Email 已被使用');

  const tempPassword = crypto.randomBytes(6).toString('hex'); // 12 chars
  const password_hash = await bcrypt.hash(tempPassword, 10);

  const user = await createUser({ ...data, password_hash });
  try {
    await sendWelcomeEmail(user.email, user.full_name, tempPassword);
  } catch (emailErr) {
    console.error('[email] 歡迎信發送失敗:', emailErr);
  }

  const { password_hash: _, password_reset_token, password_reset_expires, ...pub } = user;
  return pub;
}

export async function editUser(id: string, data: UpdateUserData) {
  const user = await findUserById(id);
  if (!user) throw new AppError(404, '使用者不存在');

  if (data.email && data.email !== user.email) {
    const existing = await findUserByEmail(data.email);
    if (existing) throw new AppError(409, '此 Email 已被使用');
  }

  const updated = await updateUser(id, data);
  const { password_hash, password_reset_token, password_reset_expires, ...pub } = updated;
  return pub;
}

export async function adminResetPassword(id: string) {
  const user = await findUserById(id);
  if (!user) throw new AppError(404, '使用者不存在');

  const newPassword = crypto.randomBytes(6).toString('hex'); // 12 chars
  const password_hash = await bcrypt.hash(newPassword, 10);
  await updatePassword(id, password_hash);
  // also set must_change_password back to true
  await db('users').where({ id }).update({ must_change_password: true, updated_at: db.fn.now() });

  return { password: newPassword };
}

export async function deleteUser(id: string) {
  const user = await db('users').where({ id }).whereNull('deleted_at').first();
  if (!user) throw new AppError(404, '使用者不存在');
  await softDeleteUser(id);
}

export async function toggleUserActive(id: string, isActive: boolean) {
  const user = await findUserById(id);
  if (!user) throw new AppError(404, '使用者不存在');
  await setUserActive(id, isActive);
}
