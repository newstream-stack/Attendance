import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { listAllowedIps, createAllowedIp, deleteAllowedIp } from '../repositories/allowedIp.repository';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authMiddleware, requireRole('admin'));

// GET /api/v1/allowed-ips
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listAllowedIps());
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/allowed-ips
router.post(
  '/',
  validate({
    body: z.object({
      ip_address: z.string().ip({ message: '請輸入有效的 IP 位址' }),
      label: z.string().max(100).nullable().optional(),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const row = await createAllowedIp(req.body.ip_address, req.body.label ?? null, req.user!.id);
      res.status(201).json(row);
    } catch (err: unknown) {
      // PostgreSQL unique violation
      if ((err as { code?: string }).code === '23505') {
        return next(new AppError(409, '此 IP 已存在'));
      }
      next(err);
    }
  },
);

// DELETE /api/v1/allowed-ips/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteAllowedIp(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
