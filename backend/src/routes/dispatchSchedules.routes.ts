import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { listSchedules, addSchedule, deleteSchedule } from '../repositories/dispatchSchedules.repository';
import { bulkAddDispatchDates } from '../repositories/dispatchDates.repository';
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
      days_of_week: z.string().regex(/^[0-6](,[0-6])*$/), // "1,4"
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

// POST /api/v1/dispatch-schedules/apply  — 套用固定排程到指定日期範圍
router.post(
  '/apply',
  validate({
    body: z.object({
      user_id: z.string().uuid(),
      from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id, from_date, to_date } = req.body as { user_id: string; from_date: string; to_date: string };
      const schedules = await listSchedules(user_id);
      if (schedules.length === 0) throw new AppError(400, '此員工尚未設定固定排程');

      // 展開所有符合的日期
      const entries: { user_id: string; work_date: string; clock_in_time: string; clock_out_time: string; note: string | null }[] = [];
      const cur = new Date(from_date + 'T12:00:00Z');
      const last = new Date(to_date + 'T12:00:00Z');

      while (cur <= last) {
        const dow = cur.getUTCDay();
        for (const sch of schedules) {
          const days = sch.days_of_week.split(',').map(Number);
          if (days.includes(dow)) {
            const y = cur.getUTCFullYear();
            const mo = String(cur.getUTCMonth() + 1).padStart(2, '0');
            const d = String(cur.getUTCDate()).padStart(2, '0');
            entries.push({
              user_id,
              work_date: `${y}-${mo}-${d}`,
              clock_in_time: sch.clock_in_time,
              clock_out_time: sch.clock_out_time,
              note: sch.note,
            });
          }
        }
        cur.setUTCDate(cur.getUTCDate() + 1);
      }

      if (entries.length === 0) throw new AppError(400, '指定範圍內無符合排程的日期');
      const count = await bulkAddDispatchDates(entries);
      res.json({ inserted: count, total: entries.length });
    } catch (e) { next(e); }
  },
);

export default router;
