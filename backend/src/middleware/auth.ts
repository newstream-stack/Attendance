import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UserRole } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub as string,
      email: payload.email as string,
      role: payload.role as UserRole,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
