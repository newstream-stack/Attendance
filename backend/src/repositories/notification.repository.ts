import { db } from '../config/database';
import { Notification } from '../types';

export async function listNotifications(userId: string, limit = 30): Promise<Notification[]> {
  return db<Notification>('notifications')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .limit(limit);
}

export async function countUnread(userId: string): Promise<number> {
  const [{ count }] = await db('notifications')
    .where({ user_id: userId, is_read: false })
    .count('id as count');
  return Number(count);
}

export async function markRead(id: string, userId: string): Promise<void> {
  await db('notifications').where({ id, user_id: userId }).update({ is_read: true });
}

export async function markAllRead(userId: string): Promise<void> {
  await db('notifications').where({ user_id: userId, is_read: false }).update({ is_read: true });
}

export async function createNotification(data: {
  user_id: string;
  type: string;
  title: string;
  body?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
}): Promise<void> {
  await db('notifications').insert(data);
}
