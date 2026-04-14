import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { listSchedules, addSchedule, deleteSchedule } from '../repositories/dispatchSchedules.repository';
import { findUserById } from '../repositories/user.repository';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authMiddleware, requireRole('admin'));

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

// GET /api/v1/dispatch-schedules?user_id=
router.get(
  '/',
  validate({ query: z.object({ user_id: z.string().uuid() }) }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await listSchedules(req.query.user_id as string));
    } catch (e) { next(e); }
  },
);

// POST /api/v1/dispatch-schedules
router.post(
  '/',
  validate({
    body: z.object({
      user_id: z.string().uuid(),
      days_of_week: z.string().regex(/^[0-6](,[0-6])*$/),
      clock_in_time: z.string().regex(timeRegex),
      clock_out_time: z.string().regex(timeRegex),
      note: z.string().max(200).optional(),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id, days_of_week, clock_in_time, clock_out_time, note } = req.body;
      const user = await findUserById(user_id);
      if (!user) throw new AppError(404, '使用者不存在');
      if (!user.is_special_dispatch) throw new AppError(400, '此員工非特約人員');
      const row = await addSchedule(user_id, days_of_week, clock_in_time, clock_out_time, note);
      res.status(201).json(row);
    } catch (e) { next(e); }
  },
);

// DELETE /api/v1/dispatch-schedules/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteSchedule(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
