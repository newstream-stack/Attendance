-- =============================================
-- 出缺勤管理系統 Schema
-- PostgreSQL 16
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ENUM Types
-- =============================================

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'employee');

CREATE TYPE attendance_status AS ENUM ('active', 'completed', 'amended');

CREATE TYPE leave_request_status AS ENUM (
  'pending', 'approved', 'rejected', 'cancelled', 'recalled'
);

CREATE TYPE overtime_request_status AS ENUM (
  'pending', 'approved', 'rejected', 'cancelled'
);

CREATE TYPE approval_action AS ENUM ('approved', 'rejected', 'delegated');

CREATE TYPE half_day_period AS ENUM ('am', 'pm');

CREATE TYPE proxy_scope AS ENUM ('leave_approval', 'all');

CREATE TYPE email_status AS ENUM ('pending', 'sent', 'failed');

-- =============================================
-- users
-- =============================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     VARCHAR(20) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(100) NOT NULL,
  role            user_role NOT NULL DEFAULT 'employee',
  department      VARCHAR(100),
  position        VARCHAR(100),
  hire_date       DATE NOT NULL,
  manager_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password     BOOLEAN NOT NULL DEFAULT TRUE,
  password_reset_token     VARCHAR(64),
  password_reset_expires   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX users_employee_id_unique ON users(employee_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX users_email_unique ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_manager_id ON users(manager_id);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = TRUE;

-- =============================================
-- allowed_ips
-- =============================================

CREATE TABLE allowed_ips (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address  INET UNIQUE NOT NULL,
  label       VARCHAR(100),
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- attendance_records
-- =============================================

CREATE TABLE attendance_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  clock_in      TIMESTAMPTZ NOT NULL,
  clock_out     TIMESTAMPTZ,
  work_date     DATE NOT NULL,
  duration_mins INTEGER,
  status        attendance_status NOT NULL DEFAULT 'active',
  ip_address    INET,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_user_date ON attendance_records(user_id, work_date);
CREATE INDEX idx_attendance_work_date ON attendance_records(work_date);

-- =============================================
-- leave_types
-- =============================================

CREATE TABLE leave_types (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              VARCHAR(30) UNIQUE NOT NULL,
  name_zh           VARCHAR(50) NOT NULL,
  name_en           VARCHAR(50) NOT NULL,
  is_paid           BOOLEAN NOT NULL DEFAULT TRUE,
  requires_balance  BOOLEAN NOT NULL DEFAULT FALSE,
  max_days_per_year INTEGER,
  carry_over_days   INTEGER NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE
);

-- =============================================
-- leave_balances
-- =============================================

CREATE TABLE leave_balances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  leave_type_id   UUID NOT NULL REFERENCES leave_types(id),
  year            SMALLINT NOT NULL,
  allocated_mins  INTEGER NOT NULL DEFAULT 0,
  used_mins       INTEGER NOT NULL DEFAULT 0,
  carried_mins    INTEGER NOT NULL DEFAULT 0,
  adjusted_mins   INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, leave_type_id, year)
);

CREATE INDEX idx_leave_balances_user_year ON leave_balances(user_id, year);

-- =============================================
-- leave_requests
-- =============================================

CREATE TABLE leave_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id),
  leave_type_id       UUID NOT NULL REFERENCES leave_types(id),
  work_proxy_user_id  UUID REFERENCES users(id),
  start_time          TIMESTAMPTZ NOT NULL,
  end_time            TIMESTAMPTZ NOT NULL,
  duration_mins       INTEGER NOT NULL,
  half_day            BOOLEAN NOT NULL DEFAULT FALSE,
  half_day_period     half_day_period,
  reason              TEXT,
  status              leave_request_status NOT NULL DEFAULT 'pending',
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leave_requests_user_status ON leave_requests(user_id, status);
CREATE INDEX idx_leave_requests_pending ON leave_requests(status) WHERE status = 'pending';
CREATE INDEX idx_leave_requests_user_id ON leave_requests(user_id);

-- =============================================
-- leave_approvals
-- =============================================

CREATE TABLE leave_approvals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id  UUID NOT NULL REFERENCES leave_requests(id),
  approver_id       UUID NOT NULL REFERENCES users(id),
  level             SMALLINT NOT NULL DEFAULT 1,
  action            approval_action NOT NULL,
  comment           TEXT,
  acted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leave_approvals_request ON leave_approvals(leave_request_id);

-- =============================================
-- overtime_requests
-- =============================================

CREATE TABLE overtime_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  work_date       DATE NOT NULL,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ NOT NULL,
  duration_mins   INTEGER NOT NULL,
  reason          TEXT,
  convert_to_comp BOOLEAN NOT NULL DEFAULT FALSE,
  status          overtime_request_status NOT NULL DEFAULT 'pending',
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_overtime_requests_user_status ON overtime_requests(user_id, status);
CREATE INDEX idx_overtime_requests_pending ON overtime_requests(status) WHERE status = 'pending';

-- =============================================
-- overtime_approvals
-- =============================================

CREATE TABLE overtime_approvals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overtime_request_id UUID NOT NULL REFERENCES overtime_requests(id),
  approver_id         UUID NOT NULL REFERENCES users(id),
  action              approval_action NOT NULL,
  comment             TEXT,
  acted_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_overtime_approvals_request ON overtime_approvals(overtime_request_id);

-- =============================================
-- proxy_assignments
-- =============================================

CREATE TABLE proxy_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_id  UUID NOT NULL REFERENCES users(id),
  proxy_id      UUID NOT NULL REFERENCES users(id),
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  scope         proxy_scope NOT NULL DEFAULT 'leave_approval',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proxy_assignments_principal ON proxy_assignments(principal_id, is_active);

-- =============================================
-- public_holidays
-- =============================================

CREATE TABLE public_holidays (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date  DATE UNIQUE NOT NULL,
  name          VARCHAR(100) NOT NULL,
  year          SMALLINT NOT NULL
);

CREATE INDEX idx_public_holidays_year ON public_holidays(year);

-- =============================================
-- notifications
-- =============================================

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  type            VARCHAR(50) NOT NULL,
  title           VARCHAR(200) NOT NULL,
  body            TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  reference_type  VARCHAR(50),
  reference_id    UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- =============================================
-- email_logs
-- =============================================

CREATE TABLE email_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email VARCHAR(255) NOT NULL,
  subject         VARCHAR(255) NOT NULL,
  template        VARCHAR(100) NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  status          email_status NOT NULL DEFAULT 'pending',
  error_msg       TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_logs_pending ON email_logs(status) WHERE status = 'pending';
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at);
