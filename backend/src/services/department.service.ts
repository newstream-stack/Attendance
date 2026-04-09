import { AppError } from '../middleware/errorHandler';
import {
  listDepartments,
  findDepartmentById,
  findDepartmentByName,
  createDepartment,
  updateDepartment,
} from '../repositories/department.repository';

export async function getDepartments() {
  return listDepartments();
}

export async function createNewDepartment(data: { name: string; description?: string | null }) {
  const existing = await findDepartmentByName(data.name);
  if (existing) throw new AppError(409, '此部門名稱已存在');
  return createDepartment(data);
}

export async function editDepartment(id: string, data: { name?: string; description?: string | null; is_active?: boolean }) {
  const dept = await findDepartmentById(id);
  if (!dept) throw new AppError(404, '部門不存在');

  if (data.name && data.name !== dept.name) {
    const existing = await findDepartmentByName(data.name);
    if (existing) throw new AppError(409, '此部門名稱已存在');
  }

  return updateDepartment(id, data);
}
