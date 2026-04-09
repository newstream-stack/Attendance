import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import {
  submitOvertimeRequest, getMyOvertimeRequests, getPendingOvertimeForApprover,
  approveOvertimeRequest, rejectOvertimeRequest, cancelOvertimeRequest,
} from '../services/overtime.service';

const router = Router();
router.use(authMiddleware);

// GET /api/v1/overtime/requests
router.get('/requests', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await getMyOvertimeRequests(req.user!.id)); } catch (e) { next(e); }
});

// GET /api/v1/overtime/requests/pending-approval
router.get('/requests/pending-approval', requireRole('admin', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await getPendingOvertimeForApprover(req.user!.id)); } catch (e) { next(e); }
});

// POST /api/v1/overtime/requests
router.post(
  '/requests',
  validate({
    body: z.object({
      work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      start_time: z.string().datetime(),
      end_time: z.string().datetime(),
      reason: z.string().max(500).nullable().optional(),
      convert_to_comp: z.boolean().default(false),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const r = req.body;
      const result = await submitOvertimeRequest({
        userId: req.user!.id,
        workDate: r.work_date,
        startTime: new Date(r.start_time),
        endTime: new Date(r.end_time),
        reason: r.reason,
        convertToComp: r.convert_to_comp,
      });
      res.status(201).json(result);
    } catch (e) { next(e); }
  },
);

const actionSchema = validate({ body: z.object({ comment: z.string().max(500).optional() }) });

// POST /api/v1/overtime/requests/:id/approve
router.post('/requests/:id/approve', requireRole('admin', 'manager'), actionSchema, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await approveOvertimeRequest(req.params.id, req.user!.id, req.body.comment);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /api/v1/overtime/requests/:id/reject
router.post('/requests/:id/reject', requireRole('admin', 'manager'), actionSchema, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rejectOvertimeRequest(req.params.id, req.user!.id, req.body.comment);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /api/v1/overtime/requests/:id/cancel
router.post('/requests/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await cancelOvertimeRequest(req.params.id, req.user!.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
