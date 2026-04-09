import { db } from '../config/database';
import { AllowedIp } from '../types';

export async function listAllowedIps(): Promise<AllowedIp[]> {
  return db<AllowedIp>('allowed_ips').orderBy('created_at', 'asc');
}

export async function createAllowedIp(ipAddress: string, label: string | null, createdBy: string): Promise<AllowedIp> {
  const [row] = await db<AllowedIp>('allowed_ips')
    .insert({ ip_address: ipAddress, label, created_by: createdBy })
    .returning('*');
  return row;
}

export async function deleteAllowedIp(id: string): Promise<void> {
  await db('allowed_ips').where({ id }).delete();
}

export async function findAllowedIpByAddress(ipAddress: string): Promise<AllowedIp | undefined> {
  return db<AllowedIp>('allowed_ips').where({ ip_address: ipAddress }).first();
}
