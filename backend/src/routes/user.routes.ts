import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { getUsers, getManagers, createNewUser, editUser, toggleUserActive, adminResetPassword, deleteUser, sendUserResetEmail } from '../services/user.service';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/users/me
router.get('/me', (req: Request, res: Response) => {
  res.json(req.user);
});

// GET /api/v1/users/colleagues  (all active non-admin users, for proxy dropdown — all roles)
router.get('/colleagues', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await getUsers();
    const colleagues = users
      .filter((u) => u.role !== 'admin' && u.is_active)
      .map((u) => ({ id: u.id, full_name: u.full_name, employee_id: u.employee_id, role: u.role }));
    res.json(colleagues);
  } catch (err) { next(err); }
});

// GET /api/v1/users/managers  (dropdown for manager_id selection)
router.get('/managers', requireRole('admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const managers = await getManagers();
    res.json(managers);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/users
router.get('/', requireRole('admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await getUsers());
  } catch (err) {
    next(err);
  }
});

const createUserSchema = z.object({
  employee_id: z.string().min(1).max(20),
  email: z.string().email(),
  full_name: z.string().min(1).max(100),
  role: z.enum(['admin', 'manager', 'employee']),
  department: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  hire_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '格式須為 YYYY-MM-DD'),
  manager_id: z.string().uuid().nullable().optional(),
  track_attendance: z.boolean().optional(),
});

// POST /api/v1/users
router.post(
  '/',
  requireRole('admin'),
  validate({ body: createUserSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await createNewUser(req.body);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  },
);

const updateUserSchema = z.object({
  employee_id: z.string().min(1).max(20).optional(),
  email: z.string().email().optional(),
  full_name: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'manager', 'employee']).optional(),
  department: z.string().max(100).nullable().optional(),
  position: z.string().max(100).nullable().optional(),
  hire_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  manager_id: z.string().uuid().nullable().optional(),
  track_attendance: z.boolean().optional(),
});

// PUT /api/v1/users/:id
router.put(
  '/:id',
  requireRole('admin'),
  validate({ body: updateUserSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await editUser(req.params.id, req.body);
      res.json(user);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/users/:id/reset-password
router.post('/:id/reset-password', requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adminResetPassword(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/users/:id/send-reset-email  (admin: 傳送密碼重設信給員工)
router.post('/:id/send-reset-email', requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await sendUserResetEmail(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/users/:id
router.delete('/:id', requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteUser(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/users/:id/deactivate
router.put('/:id/deactivate', requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await toggleUserActive(req.params.id, false);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/users/:id/reactivate
router.put('/:id/reactivate', requireRole('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await toggleUserActive(req.params.id, true);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
