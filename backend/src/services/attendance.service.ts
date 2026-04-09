import { findAllowedIpByAddress } from '../repositories/allowedIp.repository';
import {
  findTodayRecord, clockIn, clockOut, listRecords, listAllRecords,
} from '../repositories/attendance.repository';
import { AppError } from '../middleware/errorHandler';

function getTaipeiDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }); // YYYY-MM-DD
}

export async function clockInService(userId: string, ipAddress: string) {
  // IP whitelist check
  const allowed = await findAllowedIpByAddress(ipAddress);
  if (!allowed) throw new AppError(403, `此 IP（${ipAddress}）不允許打卡`);

  const workDate = getTaipeiDateString();
  const existing = await findTodayRecord(userId, workDate);
  if (existing) throw new AppError(409, '今日已打卡上班');

  return clockIn(userId, workDate, ipAddress);
}

export async function clockOutService(userId: string) {
  const workDate = getTaipeiDateString();
  const record = await findTodayRecord(userId, workDate);

  if (!record) throw new AppError(404, '找不到今日打卡紀錄');
  if (record.status === 'completed') throw new AppError(409, '今日已打卡下班');

  const diffMs = Date.now() - new Date(record.clock_in).getTime();
  const durationMins = Math.round(diffMs / 60000);

  return clockOut(record.id, durationMins);
}

export async function getTodayRecord(userId: string) {
  const workDate = getTaipeiDateString();
  return findTodayRecord(userId, workDate);
}

export async function getMyHistory(userId: string, startDate: string, endDate: string) {
  return listRecords(userId, startDate, endDate);
}

export async function getAllHistory(startDate: string, endDate: string) {
  return listAllRecords(startDate, endDate);
}
