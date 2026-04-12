import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { login, refreshSession, changePassword, forgotPassword, resetPassword } from '../services/auth.service';
import { authMiddleware } from '../middleware/auth';
import { env } from '../config/env';

const router = Router();

const REFRESH_COOKIE = 'refreshToken';
const cookieOpts = {
  httpOnly: true,
  secure: true, // 跨域部署必須 Secure=true
  sameSite: 'none' as const, // 跨域 Cookie 必須 SameSite=none
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// POST /api/v1/auth/login
router.post(
  '/login',
  validate({ body: z.object({ email: z.string().email(), password: z.string().min(1) }) }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accessToken, refreshToken, user } = await login(req.body.email, req.body.password);
      res.cookie(REFRESH_COOKIE, refreshToken, cookieOpts);
      res.json({ accessToken, user });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { accessToken, refreshToken, user } = await refreshSession(token);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOpts);
    res.json({ accessToken, user });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE);
  res.json({ ok: true });
});

// POST /api/v1/auth/change-password  (requires login)
router.post(
  '/change-password',
  authMiddleware,
  validate({
    body: z.object({
      oldPassword: z.string().min(1),
      newPassword: z.string().min(8, '新密碼至少 8 個字元'),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await changePassword(req.user!.id, req.body.oldPassword, req.body.newPassword);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/auth/forgot-password
router.post(
  '/forgot-password',
  validate({ body: z.object({ email: z.string().email() }) }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await forgotPassword(req.body.email);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/auth/reset-password
router.post(
  '/reset-password',
  validate({
    body: z.object({
      token: z.string().min(1),
      newPassword: z.string().min(8, '新密碼至少 8 個字元'),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await resetPassword(req.body.token, req.body.newPassword);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
