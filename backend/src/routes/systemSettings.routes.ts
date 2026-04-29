import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { getSystemSettings, updateSystemSettings } from '../services/systemSettings.service';

const router = Router();
router.use(authMiddleware);

// GET /api/v1/system-settings
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json(await getSystemSettings()); } catch (e) { next(e); }
});

// PUT /api/v1/system-settings
router.put(
  '/',
  requireRole('admin'),
  validate({
    body: z.object({
      work_start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      work_end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      late_tolerance_mins: z.number().int().min(0).optional(),
      hours_per_day: z.number().int().min(1).max(24).optional(),
      base_bonus_days: z.number().int().min(0).optional(),
      notification_cc_emails: z.array(z.string().email()).optional(),
    }),
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await updateSystemSettings(req.body)); } catch (e) { next(e); }
  },
);

export default router;
