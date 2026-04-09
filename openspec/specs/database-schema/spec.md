# database-schema

## Purpose
定義系統所有 PostgreSQL 資料表結構、索引及種子資料，作為整個考勤系統的資料層基礎。

## Requirements

### Requirement: 使用者資料表
系統 SHALL 建立 `users` 資料表儲存員工基本資料、角色與組織關係。

#### Scenario: 建立使用者資料表
- **WHEN** 執行 `001_schema.sql`
- **THEN** `users` 資料表存在，含 `id`（UUID PK）、`employee_id`（唯一）、`email`（唯一）、`password_hash`、`full_name`、`role`（ENUM: admin/manager/employee）、`department`、`position`、`hire_date`、`manager_id`（FK → users）、`is_active`、`created_at`、`updated_at`、`deleted_at`

### Requirement: IP 白名單資料表
系統 SHALL 建立 `allowed_ips` 資料表儲存允許打卡的公司 IP，可由管理者維護多組 IP。

#### Scenario: IP 白名單資料表建立
- **WHEN** 執行 `001_schema.sql`
- **THEN** `allowed_ips` 資料表存在，含 `id`（UUID PK）、`ip_address`（唯一）、`label`（備註說明）、`created_by`（FK → users）、`created_at`

### Requirement: 打卡紀錄資料表
系統 SHALL 建立 `attendance_records` 資料表儲存員工打卡上下班紀錄。

#### Scenario: 打卡紀錄資料表建立
- **WHEN** 執行 `001_schema.sql`
- **THEN** `attendance_records` 資料表存在，含 `id`、`user_id`（FK）、`clock_in`（TIMESTAMPTZ）、`clock_out`（TIMESTAMPTZ，可 NULL）、`work_date`（DATE，供快速查詢）、`duration_mins`（INTEGER，可 NULL）、`status`（ENUM: active/completed/amended）、`ip_address`（INET）、`note`

### Requirement: 假別定義資料表
系統 SHALL 建立 `leave_types` 資料表定義系統支援的假別種類。

#### Scenario: 假別資料表建立
- **WHEN** 執行 `001_schema.sql`
- **THEN** `leave_types` 資料表存在，含 `id`、`code`（唯一，如 'annual'/'comp'/'sick'/'personal'/'bereavement'）、`name_zh`（繁體中文名稱）、`name_en`、`is_paid`、`requires_balance`、`max_days_per_year`、`carry_over_days`、`is_active`

### Requirement: 假期額度資料表
系統 SHALL 建立 `leave_balances` 資料表追蹤每位員工每年每假別的額度（以分鐘為單位）。

#### Scenario: 假期額度資料表建立
- **WHEN** 執行 `001_schema.sql`
- **THEN** `leave_balances` 資料表存在，含 `id`、`user_id`（FK）、`leave_type_id`（FK）、`year`（SMALLINT）、`allocated_mins`、`used_mins`、`carried_mins`、`adjusted_mins`；UNIQUE constraint 在 (user_id, leave_type_id, year)

### Requirement: 請假申請資料表
系統 SHALL 建立 `leave_requests` 資料表儲存員工請假申請與工作代理人。

#### Scenario: 請假申請資料表建立
- **WHEN** 執行 `001_schema.sql`
- **THEN** `leave_requests` 資料表存在，含 `id`、`user_id`（FK）、`leave_type_id`（FK）、`work_proxy_user_id`（FK → users，工作代理人，可 NULL）、`start_time`、`end_time`、`duration_mins`、`half_day`（BOOLEAN）、`half_day_period`（ENUM: am/pm，可 NULL）、`reason`、`status`（ENUM: pending/approved/rejected/cancelled/recalled）、`submitted_at`

### Requirement: 請假簽核紀錄資料表
系統 SHALL 建立 `leave_approvals` 資料表記錄每次簽核動作與主管意見。

#### Scenario: 簽核紀錄資料表建立
- **WHEN** 執行 `001_schema.sql`
- **THEN** `leave_approvals` 資料表存在，含 `id`、`leave_request_id`（FK）、`approver_id`（FK → users）、`level`（SMALLINT，預設 1）、`action`（ENUM: approved/rejected/delegated）、`comment`、`acted_at`

### Requirement: 加班申請資料表
系統 SHALL 建立 `overtime_requests` 資料表儲存員工加班申請。

#### Scenario: 加班申請資料表建立
- **WHEN** 執行 `001_schema.sql`
- **THEN** `overtime_requests` 資料表存在，含 `id`、`user_id`（FK）、`work_date`（DATE）、`start_time`、`end_time`、`duration_mins`、`reason`、`convert_to_comp`（BOOLEAN，是否轉補休）、`status`（ENUM: pending/approved/rejected/cancelled）

### Requirement: 加班簽核紀錄資料表
系統 SHALL 建立 `overtime_approvals` 資料表記錄加班申請的簽核動作。

#### Scenario: 加班簽核資料表建立
- **WHEN** 執行 `001_schema.sql`
- **THEN** `overtime_approvals` 資料表存在，含 `id`、`overtime_request_id`（FK）、`approver_id`（FK → users）、`action`（ENUM: approved/rejected）、`comment`、`acted_at`

### Requirement: 代理人指派資料表
系統 SHALL 建立 `proxy_assignments` 資料表設定主管不在時的簽核代理人（與工作代理人不同）。

#### Scenario: 代理人資料表建立
- **WHEN** 執行 `001_schema.sql`
- **THEN** `proxy_assignments` 資料表存在，含 `id`、`principal_id`（FK → users，被代理的主管）、`proxy_id`（FK → users，代理人）、`start_date`（DATE）、`end_date`（DATE）、`scope`（ENUM: leave_approval/all）、`is_active`、`created_by`（FK）、`created_at`

### Requirement: 國定假日資料表
系統 SHALL 建立 `public_holidays` 資料表儲存年度國定假日，供工作日計算使用。

#### Scenario: 國定假日資料表建立
- **WHEN** 執行 `001_schema.sql`
- **THEN** `public_holidays` 資料表存在，含 `id`、`holiday_date`（DATE，唯一）、`name`、`year`（SMALLINT）

### Requirement: 通知資料表
系統 SHALL 建立 `notifications` 資料表儲存系統 in-app 通知。

#### Scenario: 通知資料表建立
- **WHEN** 執行 `001_schema.sql`
- **THEN** `notifications` 資料表存在，含 `id`、`user_id`（FK）、`type`（VARCHAR，如 'leave_approved'）、`title`、`body`、`is_read`（BOOLEAN）、`reference_type`、`reference_id`（UUID）、`created_at`

### Requirement: Email 佇列資料表
系統 SHALL 建立 `email_logs` 資料表作為非同步 email 發送佇列。

#### Scenario: Email 佇列資料表建立
- **WHEN** 執行 `001_schema.sql`
- **THEN** `email_logs` 資料表存在，含 `id`、`recipient_email`、`subject`、`template`、`payload`（JSONB，信件變數）、`status`（ENUM: pending/sent/failed）、`error_msg`、`sent_at`、`created_at`

### Requirement: 種子資料
系統 SHALL 提供 `002_seed.sql` 插入初始必要資料，讓系統開箱即用。

#### Scenario: 種子資料執行後系統可登入
- **WHEN** 執行 `002_seed.sql`
- **THEN** 存在一個 admin 帳號（email: admin@company.com，密碼需首次登入修改）、6 種預設假別（年假/補休/病假/事假/喪假/其他）已寫入 `leave_types`

### Requirement: 資料庫 Index
系統 SHALL 為常用查詢欄位建立 Index，確保查詢效能。

#### Scenario: 關鍵 Index 存在
- **WHEN** 執行 `001_schema.sql`
- **THEN** 以下 Index 存在：`attendance_records(user_id, work_date)`、`leave_requests(user_id, status)`、`leave_requests(status)` where status='pending'、`notifications(user_id, is_read)`、`email_logs(status)` where status='pending'
