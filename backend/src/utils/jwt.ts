import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload, UserRole } from '../types';

export function signAccessToken(payload: { id: string; email: string; role: UserRole }): string {
  return jwt.sign(
    { sub: payload.id, email: payload.email, role: payload.role },
    env.JWT_SECRET as string, // 這裡加上 as string
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as any } // 這裡加上 as any
  );
}

export function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    env.JWT_SECRET as string, // 這裡加上 as string
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any } // 這裡加上 as any
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET as string) as JwtPayload; // 這裡加上 as string
}