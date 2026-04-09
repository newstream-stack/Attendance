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
});

// GET /api/v1/reports/attendance?start=&end=
router.get(
  '/attendance',
  validate({ query: rangeSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { start, end } = req.query as { start: string; end: string };
      const rows = await db('attendance_records as a')
        .join('users as u', 'a.user_id', 'u.id')
        .whereBetween('a.work_date', [start, end])
        .whereNull('u.deleted_at')
        .select(
          'u.employee_id', 'u.full_name', 'u.department',
          'a.work_date', 'a.clock_in', 'a.clock_out',
          'a.duration_mins', 'a.status', 'a.ip_address',
        )
        .orderBy('a.work_date').orderBy('u.full_name');

      if (req.query.format === 'csv') {
        const headers = ['員工編號', '姓名', '部門', '日期', '上班', '下班', '工時(分)', '狀態'];
        const csvRows = rows.map((r: Record<string, unknown>) => [
          r.employee_id,
          r.full_name,
          r.department ?? '',
          r.work_date,
          r.clock_in ? new Date(r.clock_in as string).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
          r.clock_out ? new Date(r.clock_out as string).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
          r.duration_mins ?? '',
          r.status,
        ].map(String).join(','));

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="attendance_${start}_${end}.csv"`);
        return res.send('\uFEFF' + [headers.join(','), ...csvRows].join('\n'));
      }

      res.json(rows);
    } catch (e) { next(e); }
  },
);

// GET /api/v1/reports/leave-summary?year=
router.get(
  '/leave-summary',
  validate({ query: z.object({ year: z.string().regex(/^\d{4}$/) }) }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const year = parseInt(req.query.year as string);
      const rows = await db('leave_balances as lb')
        .join('users as u', 'lb.user_id', 'u.id')
        .join('leave_types as lt', 'lb.leave_type_id', 'lt.id')
        .where('lb.year', year)
        .whereNull('u.deleted_at')
        .select(
          'u.employee_id', 'u.full_name', 'u.department',
          'lt.name_zh as leave_type',
          'lb.allocated_mins', 'lb.used_mins', 'lb.carried_mins', 'lb.adjusted_mins',
        )
        .orderBy('u.full_name').orderBy('lt.name_zh');

      if (req.query.format === 'csv') {
        const headers = ['員工編號', '姓名', '部門', '假別', '配發(分)', '已用(分)', '攜入(分)', '調整(分)', '餘額(分)'];
        const csvRows = rows.map((r: Record<string, unknown>) => {
          const remaining = Number(r.allocated_mins) + Number(r.carried_mins) + Number(r.adjusted_mins) - Number(r.used_mins);
          return [r.employee_id, r.full_name, r.department ?? '', r.leave_type,
            r.allocated_mins, r.used_mins, r.carried_mins, r.adjusted_mins, remaining]
            .map(String).join(',');
        });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="leave_summary_${year}.csv"`);
        return res.send('\uFEFF' + [headers.join(','), ...csvRows].join('\n'));
      }

      res.json(rows);
    } catch (e) { next(e); }
  },
);

export default router;
