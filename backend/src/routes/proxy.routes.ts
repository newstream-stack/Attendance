import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { listMyProxies, createProxy, updateProxy, deleteProxy } from '../repositories/proxy.repository';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authMiddleware);

// GET /api/v1/proxy
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try { res.json(await listMyProxies(req.user!.id)); } catch (e) { next(e); }
});

// POST /api/v1/proxy
router.post(
  '/',
  validate({
    body: z.object({
      proxy_id: z.string().uuid(),
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      scope: z.enum(['leave_approval', 'all']).default('leave_approval'),
    }).refine((d) => d.start_date <= d.end_date, { message: '結束日期不得早於開始日期', path: ['end_date'] }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body.proxy_id === req.user!.id) throw new AppError(400, '不能指定自己為代理人');
      const row = await createProxy({
        principal_id: req.user!.id,
        proxy_id: req.body.proxy_id,
        start_date: req.body.start_date,
        end_date: req.body.end_date,
        scope: req.body.scope,
        created_by: req.user!.id,
      });
      res.status(201).json(row);
    } catch (e) { next(e); }
  },
);

// PUT /api/v1/proxy/:id
router.put(
  '/:id',
  validate({
    body: z.object({
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      scope: z.enum(['leave_approval', 'all']).optional(),
      is_active: z.boolean().optional(),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const row = await updateProxy(req.params.id, req.user!.id, req.body);
      if (!row) throw new AppError(404, '找不到代理設定');
      res.json(row);
    } catch (e) { next(e); }
  },
);

// DELETE /api/v1/proxy/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteProxy(req.params.id, req.user!.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
