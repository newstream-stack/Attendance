import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import {
  listDispatchDates, addDispatchDate, bulkAddDispatchDates, deleteDispatchDate,
} from '../repositories/dispatchDates.repository';
import { findUserById } from '../repositories/user.repository';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authMiddleware, requireRole('admin'));

// GET /api/v1/dispatch-dates?user_id=&year=&month=
router.get(
  '/',
  validate({
    query: z.object({
      user_id: z.string().uuid(),
      year: z.string().regex(/^\d{4}$/).optional(),
      month: z.string().regex(/^\d{1,2}$/).optional(),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id, year, month } = req.query as { user_id: string; year?: string; month?: string };
      const rows = await listDispatchDates(
        user_id,
        year ? parseInt(year) : undefined,
        month ? parseInt(month) : undefined,
      );
      res.json(rows);
    } catch (e) { next(e); }
  },
);

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

// POST /api/v1/dispatch-dates
router.post(
  '/',
  validate({
    body: z.object({
      user_id: z.string().uuid(),
      work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      clock_in_time: z.string().regex(timeRegex).optional(),
      clock_out_time: z.string().regex(timeRegex).optional(),
      note: z.string().max(200).optional(),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id, work_date, clock_in_time, clock_out_time, note } = req.body as {
        user_id: string; work_date: string;
        clock_in_time?: string; clock_out_time?: string; note?: string;
      };
      const user = await findUserById(user_id);
      if (!user) throw new AppError(404, '使用者不存在');
      if (!user.is_special_dispatch) throw new AppError(400, '此員工非特約人員');
      const row = await addDispatchDate(user_id, work_date, clock_in_time, clock_out_time, note);
      res.status(201).json(row);
    } catch (e) { next(e); }
  },
);

// POST /api/v1/dispatch-dates/bulk
router.post(
  '/bulk',
  validate({
    body: z.object({
      user_id: z.string().uuid(),
      dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(365),
      clock_in_time: z.string().regex(timeRegex).optional(),
      clock_out_time: z.string().regex(timeRegex).optional(),
      note: z.string().max(200).optional(),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id, dates, clock_in_time, clock_out_time, note } = req.body as {
        user_id: string; dates: string[];
        clock_in_time?: string; clock_out_time?: string; note?: string;
      };
      const user = await findUserById(user_id);
      if (!user) throw new AppError(404, '使用者不存在');
      if (!user.is_special_dispatch) throw new AppError(400, '此員工非特約人員');
      const entries = dates.map(d => ({
        user_id,
        work_date: d,
        clock_in_time: clock_in_time ?? null,
        clock_out_time: clock_out_time ?? null,
        note: note ?? null,
      }));
      const count = await bulkAddDispatchDates(entries);
      res.status(201).json({ inserted: count });
    } catch (e) { next(e); }
  },
);

// DELETE /api/v1/dispatch-dates/:id
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteDispatchDate(req.params.id);
      res.json({ ok: true });
    } catch (e) { next(e); }
  },
);

export default router;
