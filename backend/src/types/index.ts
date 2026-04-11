// =============================================
// Shared TypeScript Types
// Mirrors the PostgreSQL schema
// =============================================

export type UserRole = 'admin' | 'manager' | 'employee';
export type AttendanceStatus = 'active' | 'completed' | 'amended';
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'recalled';
export type OvertimeRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type ApprovalAction = 'approved' | 'rejected' | 'delegated';
export type HalfDayPeriod = 'am' | 'pm';
export type ProxyScope = 'leave_approval' | 'all';
export type EmailStatus = 'pending' | 'sent' | 'failed';

export interface User {
  id: string;
  employee_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  position: string | null;
  hire_date: string;
  manager_id: string | null;
  is_active: boolean;
  must_change_password: boolean;
  password_reset_token: string | null;
  password_reset_expires: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export type PublicUser = Omit<User, 'password_hash'>;

export interface AllowedIp {
  id: string;
  ip_address: string;
  label: string | null;
  created_by: string;
  created_at: Date;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  clock_in: Date;
  clock_out: Date | null;
  work_date: string;
  duration_mins: number | null;
  status: AttendanceStatus;
  ip_address: string | null;
  note: string | null;
  is_late: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SystemSettings {
  id: number;
  work_start_time: string;
  work_end_time: string;
  late_tolerance_mins: number;
  hours_per_day: number;
  base_bonus_days: number;
  updated_at: Date;
}

export interface LeaveType {
  id: string;
  code: string;
  name_zh: string;
  name_en: string;
  is_paid: boolean;
  requires_balance: boolean;
  max_days_per_year: number | null;
  carry_over_days: number;
  is_active: boolean;
}

export interface LeaveBalance {
  id: string;
  user_id: string;
  leave_type_id: string;
  year: number;
  allocated_mins: number;
  used_mins: number;
  carried_mins: number;
  adjusted_mins: number;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type_id: string;
  work_proxy_user_id: string | null;
  start_time: Date;
  end_time: Date;
  duration_mins: number;
  half_day: boolean;
  half_day_period: HalfDayPeriod | null;
  reason: string | null;
  status: LeaveRequestStatus;
  submitted_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface LeaveApproval {
  id: string;
  leave_request_id: string;
  approver_id: string;
  level: number;
  action: ApprovalAction;
  comment: string | null;
  acted_at: Date;
}

export interface OvertimeRequest {
  id: string;
  user_id: string;
  work_date: string;
  start_time: Date;
  end_time: Date;
  duration_mins: number;
  reason: string | null;
  convert_to_comp: boolean;
  status: OvertimeRequestStatus;
  submitted_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface OvertimeApproval {
  id: string;
  overtime_request_id: string;
  approver_id: string;
  action: ApprovalAction;
  comment: string | null;
  acted_at: Date;
}

export interface ProxyAssignment {
  id: string;
  principal_id: string;
  proxy_id: string;
  start_date: string;
  end_date: string;
  scope: ProxyScope;
  is_active: boolean;
  created_by: string;
  created_at: Date;
}

export interface PublicHoliday {
  id: string;
  holiday_date: string;
  name: string;
  year: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  reference_type: string | null;
  reference_id: string | null;
  created_at: Date;
}

export interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  template: string;
  payload: Record<string, unknown>;
  status: EmailStatus;
  error_msg: string | null;
  sent_at: Date | null;
  created_at: Date;
}

export type MakeupPunchType = 'clock_in' | 'clock_out';
export type MakeupPunchStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface MakeupPunchRules {
  id: number;
  deadline_working_days: number;
  reason_required: boolean;
  updated_at: Date;
}

export interface MakeupPunchRequest {
  id: string;
  user_id: string;
  work_date: string;
  punch_type: MakeupPunchType;
  requested_time: string;
  reason: string | null;
  status: MakeupPunchStatus;
  reviewed_by: string | null;
  review_comment: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface OutingRecord {
  id: string;
  user_id: string;
  outing_date: string;
  destination: string;
  leave_type_id: string | null;
  note: string | null;
  created_at: Date;
  updated_at: Date;
}

// JWT payload
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
