import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { getDepartments, createNewDepartment, editDepartment } from '../services/department.service';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/departments — all roles can read (for dropdowns)
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await getDepartments());
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(255).nullable().optional(),
});

// POST /api/v1/departments
router.post(
  '/',
  requireRole('admin'),
  validate({ body: createSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dept = await createNewDepartment(req.body);
      res.status(201).json(dept);
    } catch (err) {
      next(err);
    }
  },
);

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(255).nullable().optional(),
  is_active: z.boolean().optional(),
});

// PUT /api/v1/departments/:id
router.put(
  '/:id',
  requireRole('admin'),
  validate({ body: updateSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dept = await editDepartment(req.params.id, req.body);
      res.json(dept);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
