import { db } from '../config/database';
import { SystemSettings } from '../types';

export async function getSettings(): Promise<SystemSettings> {
  return db<SystemSettings>('system_settings').where({ id: 1 }).first() as Promise<SystemSettings>;
}

export async function updateSettings(data: Partial<Omit<SystemSettings, 'id' | 'updated_at'>>): Promise<SystemSettings> {
  const [row] = await db<SystemSettings>('system_settings')
    .where({ id: 1 })
    .update({ ...data, updated_at: db.fn.now() })
    .returning('*');
  return row;
}
