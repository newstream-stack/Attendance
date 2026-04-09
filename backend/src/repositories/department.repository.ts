import { db } from '../config/database';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function listDepartments(): Promise<Department[]> {
  return db<Department>('departments').orderBy('name');
}

export async function findDepartmentById(id: string): Promise<Department | undefined> {
  return db<Department>('departments').where({ id }).first();
}

export async function findDepartmentByName(name: string): Promise<Department | undefined> {
  return db<Department>('departments').whereRaw('LOWER(name) = LOWER(?)', [name]).first();
}

export async function createDepartment(data: { name: string; description?: string | null }): Promise<Department> {
  const [dept] = await db<Department>('departments').insert(data).returning('*');
  return dept;
}

export async function updateDepartment(id: string, data: { name?: string; description?: string | null; is_active?: boolean }): Promise<Department> {
  const [dept] = await db<Department>('departments')
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() })
    .returning('*');
  return dept;
}
