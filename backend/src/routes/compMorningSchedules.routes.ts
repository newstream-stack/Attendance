import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import {
  listCompMorningSchedules, addCompMorningSchedule, deleteCompMorningSchedule,
} from '../repositories/compMorningSchedules.repository';
import { findUserById } from '../repositories/user.repository';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authMiddleware, requireRole('admin'));

// GET /api/v1/comp-morning-schedules?user_id=
router.get(
  '/',
  validate({ query: z.object({ user_id: z.string().uuid() }) }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await listCompMorningSchedules(req.query.user_id as string));
    } catch (e) { next(e); }
  },
);

// POST /api/v1/comp-morning-schedules
router.post(
  '/',
  validate({
    body: z.object({
      user_id: z.string().uuid(),
      days_of_week: z.string().regex(/^[0-6](,[0-6])*$/),
      note: z.string().max(200).optional(),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id, days_of_week, note } = req.body as { user_id: string; days_of_week: string; note?: string };
      const user = await findUserById(user_id);
      if (!user) throw new AppError(404, '使用者不存在');
      const row = await addCompMorningSchedule(user_id, days_of_week, note);
      res.status(201).json(row);
    } catch (e) { next(e); }
  },
);

// DELETE /api/v1/comp-morning-schedules/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteCompMorningSchedule(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
