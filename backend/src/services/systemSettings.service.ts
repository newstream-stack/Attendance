import { getSettings, updateSettings } from '../repositories/systemSettings.repository';
import { SystemSettings } from '../types';

export async function getSystemSettings(): Promise<SystemSettings> {
  return getSettings();
}

export async function updateSystemSettings(
  data: Partial<Omit<SystemSettings, 'id' | 'updated_at'>>,
): Promise<SystemSettings> {
  return updateSettings(data);
}
