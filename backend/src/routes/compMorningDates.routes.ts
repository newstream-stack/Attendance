import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import {
  listCompMorningDates, addCompMorningDate, bulkAddCompMorningDates, deleteCompMorningDate,
} from '../repositories/compMorningDates.repository';
import { findUserById } from '../repositories/user.repository';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authMiddleware, requireRole('admin'));

// GET /api/v1/comp-morning-dates?user_id=&year=&month=
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
      const rows = await listCompMorningDates(
        user_id,
        year ? parseInt(year) : undefined,
        month ? parseInt(month) : undefined,
      );
      res.json(rows);
    } catch (e) { next(e); }
  },
);

// POST /api/v1/comp-morning-dates
router.post(
  '/',
  validate({
    body: z.object({
      user_id: z.string().uuid(),
      work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      note: z.string().max(200).optional(),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id, work_date, note } = req.body as { user_id: string; work_date: string; note?: string };
      const user = await findUserById(user_id);
      if (!user) throw new AppError(404, '使用者不存在');
      const row = await addCompMorningDate(user_id, work_date, note);
      res.status(201).json(row);
    } catch (e) { next(e); }
  },
);

// POST /api/v1/comp-morning-dates/bulk
router.post(
  '/bulk',
  validate({
    body: z.object({
      user_id: z.string().uuid(),
      dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(365),
      note: z.string().max(200).optional(),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id, dates, note } = req.body as { user_id: string; dates: string[]; note?: string };
      const user = await findUserById(user_id);
      if (!user) throw new AppError(404, '使用者不存在');
      const entries = dates.map(d => ({ user_id, work_date: d, note: note ?? null }));
      const count = await bulkAddCompMorningDates(entries);
      res.status(201).json({ inserted: count });
    } catch (e) { next(e); }
  },
);

// DELETE /api/v1/comp-morning-dates/:id
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteCompMorningDate(req.params.id);
      res.json({ ok: true });
    } catch (e) { next(e); }
  },
);

export default router;
