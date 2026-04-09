-- =============================================
-- Seed Data
-- =============================================

-- =============================================
-- 預設假別（leave_types）
-- =============================================

INSERT INTO leave_types (code, name_zh, name_en, is_paid, requires_balance, max_days_per_year, carry_over_days, is_active) VALUES
  ('annual',      '年假',   'Annual Leave',          TRUE,  TRUE,  NULL, 0, TRUE),
  ('comp',        '補休',   'Compensatory Leave',    TRUE,  TRUE,  NULL, 0, TRUE),
  ('sick',        '病假',   'Sick Leave',            TRUE,  FALSE, 30,   0, TRUE),
  ('personal',    '事假',   'Personal Leave',        FALSE, FALSE, 14,   0, TRUE),
  ('bereavement', '喪假',   'Bereavement Leave',     TRUE,  FALSE, NULL, 0, TRUE),
  ('other',       '其他',   'Other',                 FALSE, FALSE, NULL, 0, TRUE)
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- 初始管理員帳號
-- 預設密碼: Admin@1234（bcrypt hash，cost=10）
-- 首次登入必須修改密碼
-- =============================================

INSERT INTO users (
  employee_id,
  email,
  password_hash,
  full_name,
  role,
  hire_date,
  is_active,
  must_change_password
) VALUES (
  'EMP001',
  'admin@company.com',
  '$2a$10$aCj4PFb3RXpv3ttShcanQumu2n3xTMKJN0Y73dMO2VbfrAXLNcOP2',
  '系統管理員',
  'admin',
  CURRENT_DATE,
  TRUE,
  TRUE
) ON CONFLICT (email) DO NOTHING;
