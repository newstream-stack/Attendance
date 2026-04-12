import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { db } from '../config/database';

const router = Router();
router.use(authMiddleware, requireRole('admin', 'manager'));

const rangeSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  user_id: z.string().uuid().optional(),
});

// GET /api/v1/reports/attendance?start=&end=&user_id=
router.get(
  '/attendance',
  validate({ query: rangeSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start, end, user_id } = req.query as { start: string; end: string; user_id?: string };

      const q = db('attendance_records as a')
        .join('users as u', 'a.user_id', 'u.id')
        .whereBetween('a.work_date', [start, end])
        .whereNull('u.deleted_at')
        .select(
          'u.employee_id', 'u.full_name', 'u.department',
          'a.work_date', 'a.clock_in', 'a.clock_out',
          'a.duration_mins', 'a.status', 'a.is_late',
        )
        .orderBy('a.work_date').orderBy('u.full_name');

      if (user_id) {
        q.where('a.user_id', user_id);
      }

      const rows = await q;

      if (req.query.format === 'csv') {
        const headers = ['姓名', '部門', '日期', '上班', '下班', '工時(分)', '狀態', '遲到'];
        const csvRows = rows.map((r: Record<string, unknown>) => [
          r.full_name,
          r.department ?? '',
          r.work_date,
          r.clock_in ? new Date(r.clock_in as string).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
          r.clock_out ? new Date(r.clock_out as string).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
          r.duration_mins ?? '',
          r.status,
          r.is_late ? '是' : '否',
        ].map(String).join(','));

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="attendance_${start}_${end}.csv"`);
        return res.send('\uFEFF' + [headers.join(','), ...csvRows].join('\n'));
      }

      res.json(rows);
    } catch (e) { next(e); }
  },
);

// GET /api/v1/reports/leave-summary?start=&end=&name=&leave_type_id=
router.get(
  '/leave-summary',
  validate({
    query: z.object({
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      user_id: z.string().uuid().optional(),
      leave_type_id: z.string().uuid().optional(),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start, end, user_id, leave_type_id } = req.query as {
        start: string; end: string; user_id?: string; leave_type_id?: string;
      };

      const q = db('leave_requests as lr')
        .join('users as u', 'lr.user_id', 'u.id')
        .join('leave_types as lt', 'lr.leave_type_id', 'lt.id')
        .whereNull('u.deleted_at')
        .whereRaw('lr.start_time::date <= ?', [end])
        .whereRaw('lr.end_time::date >= ?', [start])
        .select(
          'u.full_name', 'u.department',
          'lt.name_zh as leave_type',
          'lr.start_time', 'lr.end_time',
          'lr.duration_mins', 'lr.status', 'lr.reason',
        )
        .orderBy('lr.start_time').orderBy('u.full_name');

      if (user_id) {
        q.where('lr.user_id', user_id);
      }
      if (leave_type_id) {
        q.where('lr.leave_type_id', leave_type_id);
      }

      const rows = await q;

      if (req.query.format === 'csv') {
        const headers = ['姓名', '部門', '假別', '開始', '結束', '時數(分)', '狀態'];
        const csvRows = rows.map((r: Record<string, unknown>) => [
          r.full_name,
          r.department ?? '',
          r.leave_type,
          new Date(r.start_time as string).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }),
          new Date(r.end_time as string).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }),
          r.duration_mins ?? '',
          r.status,
        ].map(String).join(','));
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="leave_${start}_${end}.csv"`);
        return res.send('\uFEFF' + [headers.join(','), ...csvRows].join('\n'));
      }

      res.json(rows);
    } catch (e) { next(e); }
  },
);

export default router;
