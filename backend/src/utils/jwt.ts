import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload, UserRole } from '../types';

export function signAccessToken(payload: { id: string; email: string; role: UserRole }): string {
  // 這樣寫可以確保傳給 jwt.sign 的第二個參數絕對是 string
  const secret: string = env.JWT_SECRET;

  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any
  };

  return jwt.sign(
    { sub: payload.id, email: payload.email, role: payload.role },
    secret,
    options
  );
}

export function signRefreshToken(userId: string): string {
  const secret: string = env.JWT_SECRET;

  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any
  };

  return jwt.sign(
    { sub: userId, type: 'refresh' },
    secret,
    options
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}