import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth';
import { listNotifications, countUnread, markRead, markAllRead } from '../repositories/notification.repository';

const router = Router();
router.use(authMiddleware);

// GET /api/v1/notifications
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await listNotifications(req.user!.id);
    const unread = await countUnread(req.user!.id);
    res.json({ notifications, unread });
  } catch (e) { next(e); }
});

// PUT /api/v1/notifications/:id/read
router.put('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await markRead(req.params.id, req.user!.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// PUT /api/v1/notifications/read-all
router.put('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await markAllRead(req.user!.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
