import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { upload, saveAttachment, resolveAttachmentPath } from '../middleware/upload';
import {
  getLeaveTypes, createNewLeaveType, editLeaveType,
  getMyBalances, getMyAllBalances, allocateAnnualAll, adjustLeaveBalance,
  previewAnnualLeave, getAllAnnualBalances,
  submitLeaveRequest, getMyLeaveRequests, getPendingForApprover,
  approveLeaveRequest, rejectLeaveRequest, cancelLeaveRequest, deleteLeaveRequest,
  getPendingProxyRequests, proxyApproveLeave, proxyRejectLeave,
  uploadLeaveAttachment, serveLeaveAttachment,
} from '../services/leave.service';

const router = Router();
router.use(authMiddleware);

// ─── Leave Types ─────────────────────────────────────────────────────────────

router.get('/types', async (_req, res, next) => {
  try { res.json(await getLeaveTypes()); } catch (e) { next(e); }
});

router.post(
  '/types',
  requireRole('admin'),
  validate({
    body: z.object({
      code: z.string().min(1).max(30),
      name_zh: z.string().min(1).max(50),
      name_en: z.string().min(1).max(50),
      is_paid: z.boolean(),
      requires_balance: z.boolean(),
      requires_attachment: z.boolean().default(false),
      max_days_per_year: z.number().int().positive().nullable().optional(),
      carry_over_days: z.number().int().min(0).default(0),
      is_active: z.boolean().default(true),
    }),
  }),
  async (req, res, next) => {
    try { res.status(201).json(await createNewLeaveType(req.body)); } catch (e) { next(e); }
  },
);

router.put(
  '/types/:id',
  requireRole('admin'),
  validate({
    body: z.object({
      name_zh: z.string().min(1).max(50).optional(),
      name_en: z.string().min(1).max(50).optional(),
      is_paid: z.boolean().optional(),
      requires_balance: z.boolean().optional(),
      requires_attachment: z.boolean().optional(),
      max_days_per_year: z.number().int().positive().nullable().optional(),
      carry_over_days: z.number().int().min(0).optional(),
      is_active: z.boolean().optional(),
    }),
  }),
  async (req, res, next) => {
    try { res.json(await editLeaveType(req.params.id, req.body)); } catch (e) { next(e); }
  },
);

// ─── Leave Balances ───────────────────────────────────────────────────────────

router.get('/balances', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const yearParam = req.query.year as string | undefined;
    if (yearParam) {
      const year = parseInt(yearParam) || new Date().getFullYear();
      res.json(await getMyBalances(req.user!.id, year));
    } else {
      res.json(await getMyAllBalances(req.user!.id));
    }
  } catch (e) { next(e); }
});

router.post(
  '/balances/allocate-annual',
  requireRole('admin'),
  validate({ body: z.object({ year: z.number().int().min(2000).max(2100) }) }),
  async (req, res, next) => {
    try { res.json(await allocateAnnualAll(req.body.year)); } catch (e) { next(e); }
  },
);

router.get('/balances/all', requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    res.json(await getAllAnnualBalances(year));
  } catch (e) { next(e); }
});

router.get('/annual-preview', requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    res.json(await previewAnnualLeave(year));
  } catch (e) { next(e); }
});

router.put(
  '/balances/:id/adjust',
  requireRole('admin'),
  validate({ body: z.object({ adjusted_mins: z.number().int() }) }),
  async (req, res, next) => {
    try { res.json(await adjustLeaveBalance(req.params.id, req.body.adjusted_mins)); } catch (e) { next(e); }
  },
);

// ─── Leave Requests ───────────────────────────────────────────────────────────

router.get('/requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start_date, end_date, leave_type_id } = req.query as Record<string, string | undefined>;
    res.json(await getMyLeaveRequests(req.user!.id, { startDate: start_date, endDate: end_date, leaveTypeId: leave_type_id }));
  } catch (e) { next(e); }
});

router.get('/requests/pending-approval', requireRole('admin', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await getPendingForApprover(req.user!.id, req.user!.role === 'admin')); } catch (e) { next(e); }
});

router.post(
  '/requests',
  validate({
    body: z.object({
      leave_type_id: z.string().uuid(),
      work_proxy_user_id: z.string().uuid().nullable().optional(),
      start_time: z.string().datetime({ offset: true }),
      end_time: z.string().datetime({ offset: true }),
      half_day: z.boolean().default(false),
      half_day_period: z.enum(['am', 'pm']).nullable().optional(),
      reason: z.string().max(500).nullable().optional(),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const r = req.body;
      const result = await submitLeaveRequest({
        userId: req.user!.id,
        leaveTypeId: r.leave_type_id,
        workProxyUserId: r.work_proxy_user_id,
        startTime: new Date(r.start_time),
        endTime: new Date(r.end_time),
        halfDay: r.half_day,
        halfDayPeriod: r.half_day_period,
        reason: r.reason,
      });
      res.status(201).json(result);
    } catch (e) { next(e); }
  },
);

const actionSchema = validate({ body: z.object({ comment: z.string().max(500).optional() }) });

router.post('/requests/:id/approve', requireRole('admin', 'manager'), actionSchema, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await approveLeaveRequest(req.params.id, req.user!.id, req.body.comment);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/requests/:id/reject', requireRole('admin', 'manager'), actionSchema, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rejectLeaveRequest(req.params.id, req.user!.id, req.body.comment);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/requests/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await cancelLeaveRequest(req.params.id, req.user!.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/requests/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteLeaveRequest(req.params.id, req.user!.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ─── Attachment ──────────────────────────────────────────────────────────────

router.post('/requests/:id/attachment', upload.single('attachment'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ error: '請上傳附件' });
    const filename = await saveAttachment(req.file);
    await uploadLeaveAttachment(req.params.id, req.user!.id, filename);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/requests/:id/attachment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filePath, mimeType } = await serveLeaveAttachment(req.params.id, req.user!);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: '附件不存在' });
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(filePath);
  } catch (e) { next(e); }
});

// ─── Proxy Approval ───────────────────────────────────────────────────────────

router.get('/requests/proxy-pending', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await getPendingProxyRequests(req.user!.id)); } catch (e) { next(e); }
});

router.post('/requests/:id/proxy-approve', actionSchema, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await proxyApproveLeave(req.params.id, req.user!.id, req.body.comment);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/requests/:id/proxy-reject', actionSchema, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await proxyRejectLeave(req.params.id, req.user!.id, req.body.comment);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
