import {
  createOuting, listMyOutings, listOutingsByDate, searchOutings, deleteOuting,
} from '../repositories/outing.repository';
import { AppError } from '../middleware/errorHandler';

export async function submitOuting(data: {
  userId: string;
  outing_date: string;
  outing_time: string | null;
  outing_type: string | null;
  destination: string;
  note: string | null;
}) {
  return createOuting({
    user_id: data.userId,
    outing_date: data.outing_date,
    outing_time: data.outing_time,
    outing_type: data.outing_type,
    destination: data.destination,
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
