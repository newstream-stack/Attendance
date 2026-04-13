import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { db } from '../config/database';
import { getSettings } from '../repositories/systemSettings.repository';

const router = Router();
router.use(authMiddleware, requireRole('admin', 'manager'));

function csvEscape(val: unknown): string {
  const s = val == null ? '' : String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function toCSV(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\n');
}

function toTaipeiMins(ts: string): number {
  const d = new Date(new Date(ts).toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  return d.getHours() * 60 + d.getMinutes();
}

function fmtTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' });
}

/** 產生 start~end 之間所有工作日（週一到週五）的日期字串陣列 */
function workdaysInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (cur <= last) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) {
      dates.push(cur.toLocaleDateString('en-CA'));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

const rangeSchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  user_id: z.string().uuid().optional(),
  format: z.string().optional(),
});

// GET /api/v1/reports/attendance?start=&end=&user_id=&format=csv
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
        .where('u.role', '!=', 'admin')
        .select(
          'u.id as user_id', 'u.employee_id', 'u.full_name', 'u.department',
          'a.work_date', 'a.clock_in', 'a.clock_out',
          'a.duration_mins', 'a.status', 'a.is_late',
        )
        .orderBy('a.work_date').orderBy('u.full_name');

      if (user_id) q.where('a.user_id', user_id);

      const [rows, settings] = await Promise.all([q, getSettings()]);

      const [sh, sm] = settings.work_start_time.split(':').map(Number);
      const startMins = sh * 60 + sm + settings.late_tolerance_mins;
      const [eh, em] = settings.work_end_time.split(':').map(Number);
      const endMins = eh * 60 + em;

      type AttRow = {
        user_id: string; employee_id: string; full_name: string; department: string | null;
        work_date: string; clock_in: string | null; clock_out: string | null;
        duration_mins: number | null; status: string; is_late: boolean;
        late_mins: number | null; early_leave_mins: number | null;
      };

      const enriched: AttRow[] = (rows as Omit<AttRow, 'late_mins' | 'early_leave_mins'>[]).map(r => {
        let late_mins: number | null = null;
        if (r.clock_in) {
          const diff = toTaipeiMins(r.clock_in) - startMins;
          if (diff > 0) late_mins = diff;
        }
        let early_leave_mins: number | null = null;
        if (r.clock_out) {
          const diff = endMins - toTaipeiMins(r.clock_out);
          if (diff > 0) early_leave_mins = diff;
        }
        return { ...r, late_mins, early_leave_mins };
      });

      if (req.query.format === 'csv') {
        // ── 全員 × 每個工作日 的 CSV ──
        const dates = workdaysInRange(start, end);

        // 取得所有員工（含被篩選的特定員工）
        const empQ = db('users').whereNull('deleted_at').where('role', '!=', 'admin').orderBy('department').orderBy('full_name')
          .select('id', 'employee_id', 'full_name', 'department');
        if (user_id) empQ.where('id', user_id);
        const employees = await empQ as { id: string; employee_id: string; full_name: string; department: string | null }[];

        // 建立 attendance map: `${user_id}_${work_date}` → row
        const attMap = new Map<string, AttRow>();
        for (const r of enriched) {
          const dateStr = new Date(r.work_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
          attMap.set(`${r.user_id}_${dateStr}`, r);
        }

        // 取得核准假單
        const leaveQ = db('leave_requests as lr')
          .join('leave_types as lt', 'lr.leave_type_id', 'lt.id')
          .where('lr.status', 'approved')
          .whereRaw('lr.start_time::date <= ?', [end])
          .whereRaw('lr.end_time::date >= ?', [start])
          .select('lr.user_id', 'lt.name_zh as leave_type', 'lr.start_time', 'lr.end_time', 'lr.duration_mins');
        if (user_id) leaveQ.where('lr.user_id', user_id);
        const leaveRows = await leaveQ as {
          user_id: string; leave_type: string;
          start_time: string; end_time: string; duration_mins: number | null;
        }[];

        // 建立 leave map: user_id → list of approved leaves
        const leaveMap = new Map<string, typeof leaveRows>();
        for (const lr of leaveRows) {
          if (!leaveMap.has(lr.user_id)) leaveMap.set(lr.user_id, []);
          leaveMap.get(lr.user_id)!.push(lr);
        }

        const headers = ['員工編號', '姓名', '部門', '日期', '狀態', '上班時間', '下班時間', '工時(分鐘)', '遲到(分鐘)', '早退(分鐘)', '請假類型', '請假時數(分鐘)'];
        const csvRows: unknown[][] = [];

        for (const date of dates) {
          for (const emp of employees) {
            const att = attMap.get(`${emp.id}_${date}`);
            const empLeaves = leaveMap.get(emp.id) ?? [];
            const dayLeave = empLeaves.find(lr => {
              const ls = new Date(lr.start_time).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
              const le = new Date(lr.end_time).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
              return date >= ls && date <= le;
            });

            let status: string;
            let clockIn = '', clockOut = '', durationMins: string | number = '', lateMins: string | number = '', earlyMins: string | number = '';
            let leaveType = '', leaveMins: string | number = '';

            if (att) {
              status = '出勤';
              clockIn = att.clock_in ? fmtTime(att.clock_in) : '';
              clockOut = att.clock_out ? fmtTime(att.clock_out) : '';
              durationMins = att.duration_mins ?? '';
              lateMins = att.late_mins ?? '';
              earlyMins = att.early_leave_mins ?? '';
              if (dayLeave) {
                leaveType = dayLeave.leave_type;
                leaveMins = dayLeave.duration_mins ?? '';
              }
            } else if (dayLeave) {
              status = '請假';
              leaveType = dayLeave.leave_type;
              leaveMins = dayLeave.duration_mins ?? '';
            } else {
              status = '缺勤';
            }

            csvRows.push([
              emp.employee_id, emp.full_name, emp.department ?? '',
              date, status, clockIn, clockOut, durationMins, lateMins, earlyMins,
              leaveType, leaveMins,
            ]);
          }
        }

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="attendance_${start}_${end}.csv"`);
        return res.send('\uFEFF' + toCSV(headers, csvRows));
      }

      res.json(enriched);
    } catch (e) { next(e); }
  },
);

// GET /api/v1/reports/leave-summary?start=&end=&user_id=&leave_type_id=&format=csv
router.get(
  '/leave-summary',
  validate({
    query: z.object({
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      user_id: z.string().uuid().optional(),
      leave_type_id: z.string().uuid().optional(),
      format: z.string().optional(),
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

      if (user_id) q.where('lr.user_id', user_id);
      if (leave_type_id) q.where('lr.leave_type_id', leave_type_id);

      const rows = await q;

      if (req.query.format === 'csv') {
        const headers = ['姓名', '部門', '假別', '開始', '結束', '時數(分鐘)', '狀態', '原因'];
        const csvRows = rows.map((r: Record<string, unknown>) => [
          r.full_name,
          r.department ?? '',
          r.leave_type,
          new Date(r.start_time as string).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }),
          new Date(r.end_time as string).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }),
          r.duration_mins ?? '',
          r.status,
          r.reason ?? '',
        ]);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="leave_${start}_${end}.csv"`);
        return res.send('\uFEFF' + toCSV(headers, csvRows));
      }

      res.json(rows);
    } catch (e) { next(e); }
  },
);

// GET /api/v1/reports/monthly-summary?year=2026&month=4
router.get(
  '/monthly-summary',
  validate({
    query: z.object({
      year: z.string().regex(/^\d{4}$/),
      month: z.string().regex(/^\d{1,2}$/),
      format: z.string().optional(),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { year, month } = req.query as { year: string; month: string };
      const y = parseInt(year);
      const m = parseInt(month);
      const start = `${year}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const end = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const [leaveTypes, employees, settings] = await Promise.all([
        db('leave_types').where('is_active', true).orderBy('name_zh').select('id', 'name_zh'),
        db('users').whereNull('deleted_at').where('role', '!=', 'admin').orderBy('department').orderBy('full_name').select('id', 'employee_id', 'full_name', 'department'),
        getSettings(),
      ]);

      const [attRows, leaveRows] = await Promise.all([
        db('attendance_records as a')
          .join('users as u', 'a.user_id', 'u.id')
          .whereNull('u.deleted_at')
          .where('u.role', '!=', 'admin')
          .whereBetween('a.work_date', [start, end])
          .select('a.user_id', 'a.clock_in', 'a.clock_out'),
        db('leave_requests as lr')
          .join('users as u', 'lr.user_id', 'u.id')
          .whereNull('u.deleted_at')
          .where('u.role', '!=', 'admin')
          .where('lr.status', 'approved')
          .whereRaw('lr.start_time::date <= ?', [end])
          .whereRaw('lr.end_time::date >= ?', [start])
          .select('lr.user_id', 'lr.leave_type_id', 'lr.duration_mins'),
      ]);

      const [sh, sm] = settings.work_start_time.split(':').map(Number);
      const startMins = sh * 60 + sm + settings.late_tolerance_mins;
      const [eh, em] = settings.work_end_time.split(':').map(Number);
      const endMins = eh * 60 + em;

      type EmpStat = {
        employee_id: string;
        full_name: string;
        department: string | null;
        attend_days: number;
        late_count: number;
        late_mins: number;
        early_count: number;
        early_mins: number;
        leaves: Record<string, { count: number; mins: number }>;
      };

      const empMap = new Map<string, EmpStat>(
        (employees as { id: string; employee_id: string; full_name: string; department: string | null }[]).map(e => [e.id, {
          employee_id: e.employee_id,
          full_name: e.full_name,
          department: e.department,
          attend_days: 0,
          late_count: 0,
          late_mins: 0,
          early_count: 0,
          early_mins: 0,
          leaves: {},
        }]),
      );

      for (const r of attRows as { user_id: string; clock_in: string | null; clock_out: string | null }[]) {
        const emp = empMap.get(r.user_id);
        if (!emp) continue;
        emp.attend_days++;
        if (r.clock_in) {
          const diff = toTaipeiMins(r.clock_in) - startMins;
          if (diff > 0) { emp.late_count++; emp.late_mins += diff; }
        }
        if (r.clock_out) {
          const diff = endMins - toTaipeiMins(r.clock_out);
          if (diff > 0) { emp.early_count++; emp.early_mins += diff; }
        }
      }

      for (const r of leaveRows as { user_id: string; leave_type_id: string; duration_mins: number | null }[]) {
        const emp = empMap.get(r.user_id);
        if (!emp) continue;
        if (!emp.leaves[r.leave_type_id]) emp.leaves[r.leave_type_id] = { count: 0, mins: 0 };
        emp.leaves[r.leave_type_id].count++;
        emp.leaves[r.leave_type_id].mins += r.duration_mins ?? 0;
      }

      const typedLeaveTypes = leaveTypes as { id: string; name_zh: string }[];

      const result = [...empMap.values()].map(emp => ({
        employee_id: emp.employee_id,
        full_name: emp.full_name,
        department: emp.department,
        attend_days: emp.attend_days,
        late_count: emp.late_count,
        late_mins: emp.late_mins,
        early_count: emp.early_count,
        early_mins: emp.early_mins,
        leaves: typedLeaveTypes.map(lt => ({
          leave_type_id: lt.id,
          leave_type: lt.name_zh,
          count: emp.leaves[lt.id]?.count ?? 0,
          mins: emp.leaves[lt.id]?.mins ?? 0,
        })),
      }));

      if (req.query.format === 'csv') {
        const leaveHeaders = typedLeaveTypes.flatMap(lt => [`${lt.name_zh}(次)`, `${lt.name_zh}(分鐘)`]);
        const headers = ['員工編號', '姓名', '部門', '出勤天數', '遲到次數', '遲到(分鐘)', '早退次數', '早退(分鐘)', ...leaveHeaders];
        const csvRows = result.map(emp => {
          const leaveCols = emp.leaves.flatMap(l => [l.count, l.mins]);
          return [emp.employee_id, emp.full_name, emp.department ?? '', emp.attend_days, emp.late_count, emp.late_mins, emp.early_count, emp.early_mins, ...leaveCols];
        });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="monthly_${year}_${String(m).padStart(2, '0')}.csv"`);
        return res.send('\uFEFF' + toCSV(headers, csvRows));
      }

      res.json({ leave_types: typedLeaveTypes, rows: result });
    } catch (e) { next(e); }
  },
);

export default router;
