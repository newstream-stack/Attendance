import {
  createOuting, listMyOutings, listOutingsByDate, searchOutings, deleteOuting,
} from '../repositories/outing.repository';
import { AppError } from '../middleware/errorHandler';

export async function submitOuting(data: {
  userId: string;
  outing_date: string;
  destination: string;
  leave_type_id: string | null;
  note: string | null;
}) {
  return createOuting({
    user_id: data.userId,
    outing_date: data.outing_date,
    destination: data.destination,
    leave_type_id: data.leave_type_id,
    note: data.note,
  });
}

export async function getMyOutings(userId: string) {
  return listMyOutings(userId);
}

export async function getTodayOutings() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  return listOutingsByDate(today);
}

export async function searchAdminOutings(params: { user_id?: string; start?: string; end?: string }) {
  return searchOutings(params);
}

export async function removeOuting(id: string, userId: string) {
  const row = await deleteOuting(id, userId);
  if (!row) throw new AppError(404, '找不到外出記錄或無權刪除');
}
