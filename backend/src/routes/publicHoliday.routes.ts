import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import {
  getPublicHolidaysByYear, createPublicHoliday, deletePublicHoliday, importTaiwanHolidays,
} from '../services/publicHoliday.service';

const router = Router();
router.use(authMiddleware);

// GET /api/v1/public-holidays?year=2026
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    res.json(await getPublicHolidaysByYear(year));
  } catch (e) { next(e); }
});

// POST /api/v1/public-holidays
router.post(
  '/',
  requireRole('admin'),
  validate({
    body: z.object({
      holiday_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      name: z.string().min(1).max(100),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json(await createPublicHoliday(req.body)); } catch (e) { next(e); }
  },
);

// POST /api/v1/public-holidays/import  { year }
router.post(
  '/import',
  requireRole('admin'),
  validate({
    body: z.object({
      year: z.number().int().min(2024).max(2027),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await importTaiwanHolidays(req.body.year)); } catch (e) { next(e); }
  },
);

// DELETE /api/v1/public-holidays/:id
router.delete('/:id', requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deletePublicHoliday(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
