import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import {
  getRules, updateRules,
  submitRequest, listMyRequests, listAll, listPending,
  approveRequest, rejectRequest, cancelRequest,
} from '../services/makeupPunch.service';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/makeup-punch/rules
router.get('/rules', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await getRules());
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/makeup-punch/rules
router.put(
  '/rules',
  requireRole('admin'),
  validate({
    body: z.object({
      deadline_working_days: z.number().int().min(1).optional(),
      reason_required: z.boolean().optional(),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await updateRules(req.body));
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/makeup-punch/requests
router.post(
  '/requests',
  validate({
    body: z.object({
      work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '格式須為 YYYY-MM-DD'),
      punch_type: z.enum(['clock_in', 'clock_out']),
      requested_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, '格式須為 HH:MM 或 HH:MM:SS'),
      reason: z.string().max(1000).nullable().optional(),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const record = await submitRequest(req.user!.id, req.body);
      res.status(201).json(record);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/makeup-punch/requests/all  (admin/manager — must be before /:id)
router.get('/requests/all', requireRole('admin', 'manager'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listAll());
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/makeup-punch/requests/pending  (admin/manager — must be before /:id)
router.get('/requests/pending', requireRole('admin', 'manager'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listPending());
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/makeup-punch/requests (own records only)
router.get('/requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await listMyRequests(req.user!.id));
  } catch (err) {
    next(err);
  }
});

const commentSchema = validate({ body: z.object({ comment: z.string().max(500).nullable().optional() }) });

// POST /api/v1/makeup-punch/requests/:id/approve
router.post('/requests/:id/approve', requireRole('admin', 'manager'), commentSchema, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await approveRequest(req.params.id, req.user!.id, req.body.comment);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/makeup-punch/requests/:id/reject
router.post('/requests/:id/reject', requireRole('admin', 'manager'), commentSchema, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rejectRequest(req.params.id, req.user!.id, req.body.comment);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/makeup-punch/requests/:id/cancel
router.post('/requests/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await cancelRequest(req.params.id, req.user!.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
