import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload, UserRole } from '../types';

export function signAccessToken(payload: { id: string; email: string; role: UserRole }): string {
  return jwt.sign(
    { sub: payload.id, email: payload.email, role: payload.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN },
  );
}

export function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    env.JWT_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN },
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
