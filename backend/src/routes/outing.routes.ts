import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import {
  submitOuting, getMyOutings, getTodayOutings, searchAdminOutings, removeOuting,
} from '../services/outing.service';

const router = Router();
router.use(authMiddleware);

// GET /api/v1/outings/today  (admin/manager)
router.get('/today', requireRole('admin', 'manager'), async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json(await getTodayOutings()); } catch (e) { next(e); }
});

// GET /api/v1/outings/search?name=&start=&end=  (admin/manager)
router.get(
  '/search',
  requireRole('admin', 'manager'),
  validate({
    query: z.object({
      user_id: z.string().uuid().optional(),
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user_id, start, end } = req.query as { user_id?: string; start?: string; end?: string };
      res.json(await searchAdminOutings({ user_id, start, end }));
    } catch (e) { next(e); }
  },
);

// GET /api/v1/outings  (own records)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await getMyOutings(req.user!.id)); } catch (e) { next(e); }
});

// POST /api/v1/outings
router.post(
  '/',
  validate({
    body: z.object({
      outing_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      outing_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
      outing_type: z.enum(['公出', '出差']).nullable().optional(),
      destination: z.string().min(1).max(200),
      note: z.string().max(500).nullable().optional(),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const r = req.body;
      const result = await submitOuting({
        userId: req.user!.id,
        outing_date: r.outing_date,
        outing_time: r.outing_time ?? null,
        outing_type: r.outing_type ?? null,
        destination: r.destination,
        note: r.note ?? null,
      });
      res.status(201).json(result);
    } catch (e) { next(e); }
  },
);

// DELETE /api/v1/outings/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await removeOuting(req.params.id, req.user!.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
