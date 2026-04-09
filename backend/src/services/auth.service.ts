import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { findUserByEmail, findUserById, updatePassword, setResetToken, findUserByResetToken, clearResetToken } from '../repositories/user.repository';
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { sendPasswordResetEmail } from '../utils/email';
import { PublicUser } from '../types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function toPublicUser(user: Awaited<ReturnType<typeof findUserByEmail>>): PublicUser {
  const { password_hash, ...pub } = user!;
  return pub;
}

export async function login(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) throw new AppError(401, '電子郵件或密碼不正確');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AppError(401, '電子郵件或密碼不正確');

  const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      employeeId: user.employee_id,
      mustChangePassword: user.must_change_password,
    },
  };
}

export async function refreshSession(token: string) {
  let payload: ReturnType<typeof verifyToken>;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError(401, 'Unauthorized');
  }

  const user = await findUserById(payload.sub as string);
  if (!user) throw new AppError(401, 'Unauthorized');

  const accessToken = signAccessToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      employeeId: user.employee_id,
      mustChangePassword: user.must_change_password,
    },
  };
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user) throw new AppError(404, '使用者不存在');

  const valid = await bcrypt.compare(oldPassword, user.password_hash);
  if (!valid) throw new AppError(400, '目前密碼不正確');

  const newHash = await bcrypt.hash(newPassword, 10);
  await updatePassword(userId, newHash);
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await findUserByEmail(email);
  // Always return success to avoid email enumeration
  if (!user) return;

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await setResetToken(user.id, token, expires);
  await sendPasswordResetEmail(user.email, token);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const user = await findUserByResetToken(token);
  if (!user) throw new AppError(400, '重設連結無效或已過期');

  const newHash = await bcrypt.hash(newPassword, 10);
  await updatePassword(user.id, newHash);
  await clearResetToken(user.id);
}
