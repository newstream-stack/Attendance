import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import {
  clockInService, clockOutService, getTodayRecord, getMyHistory, getAllHistory,
} from '../services/attendance.service';

const router = Router();

router.use(authMiddleware);

// POST /api/v1/attendance/clock-in
router.post('/clock-in', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Support proxy headers (nginx / load balancer)
    const raw = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? req.socket.remoteAddress
      ?? '';
    // Normalize IPv6 loopback and IPv4-mapped IPv6 to plain IPv4
    const ip = raw === '::1' ? '127.0.0.1' : raw.startsWith('::ffff:') ? raw.slice(7) : raw;
    const record = await clockInService(req.user!.id, ip);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/attendance/clock-out
router.post('/clock-out', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await clockOutService(req.user!.id);
    res.json(record);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/attendance/today
router.get('/today', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await getTodayRecord(req.user!.id);
    res.json(record ?? null);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/attendance/history?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get(
  '/history',
  validate({
    query: z.object({
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start, end } = req.query as { start: string; end: string };
      const records = await getMyHistory(req.user!.id, start, end);
      res.json(records);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/attendance/all?start=YYYY-MM-DD&end=YYYY-MM-DD  (admin/manager)
router.get(
  '/all',
  requireRole('admin', 'manager'),
  validate({
    query: z.object({
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start, end } = req.query as { start: string; end: string };
      const records = await getAllHistory(start, end);
      res.json(records);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
