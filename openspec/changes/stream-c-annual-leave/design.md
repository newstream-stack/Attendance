## Context

現有系統的主管審核邏輯以 `manager_id` 為條件，只能看到直屬下屬。年假配發邏輯（`allocateAnnualAll`）已存在但無前端介面，且未寫入 `carried_mins`（去年結轉）。系統缺乏統一的公司設定管理。

## Goals / Non-Goals

**Goals:**
- 主管審核（請假、加班）改為查詢同部門所有員工
- Admin 可在配發前預覽每人應得天數（法定 + 加碼 + 結轉），逐筆覆蓋後批次配發
- Admin 可設定全域系統參數（base_bonus_days、hours_per_day）
- 年假計算納入去年餘額全數結轉

**Non-Goals:**
- 不支援按部門或年資分組設定不同加碼天數
- 不自動排程執行年假配發（仍為手動觸發）
- 不修改非年假類型的假別配發邏輯

## Decisions

### D1：主管審核改用 department JOIN 查詢

原本 `WHERE u.manager_id = approverId`，改為：
```sql
JOIN users AS approver ON approver.id = approverId
WHERE u.department = approver.department
  AND u.id != approverId   -- 主管本人不出現在待審清單
```
若 manager 的 department 為 null，則退回原本 manager_id 查詢。

### D2：system_settings 使用單欄位固定結構表（非 key-value）

```sql
system_settings
  id               SERIAL PRIMARY KEY  -- 永遠只有 id=1 這一筆
  base_bonus_days  INTEGER NOT NULL DEFAULT 0
  hours_per_day    INTEGER NOT NULL DEFAULT 8
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

**理由**：欄位型別明確、Zod 驗證直接、不需動態 key 解析。

### D3：年假預覽 API 回傳計算結果但不寫入 DB

`GET /leave/annual-preview?year=2026` 回傳每位員工的預覽資料（不修改 DB），前端可在此階段逐筆覆蓋 `override_days`，最後送出批次配發才寫入。

```
預覽回傳結構（每位員工）：
{
  user_id, employee_id, full_name, department,
  hire_date,
  statutory_days,    ← calcAnnualLeaveDays(hire_date, year/1/1)
  bonus_days,        ← system_settings.base_bonus_days
  carried_days,      ← 去年 leave_balances 剩餘 / hours_per_day / 60（全數結轉）
  total_days,        ← statutory + bonus + carried（override 前）
  override_days,     ← null（前端填寫後送批次配發）
}
```

### D4：批次配發 API 接收覆蓋清單

`POST /leave/annual-allocate` body：
```json
{
  "year": 2026,
  "overrides": [
    { "user_id": "uuid", "allocated_days": 16 }   ← 有覆蓋的才送
  ]
}
```
Service 依序處理每位 active user：若有 override 則用 override，否則用公式結果。寫入 `allocated_mins`（allocated_days × hours_per_day × 60）與 `carried_mins`。

### Backend 新增/修改清單

**新增**
- `systemSettings.repository.ts`：`getSettings()`、`updateSettings(data)`
- `systemSettings.service.ts`：`getSettings()`、`updateSettings(data)`
- `systemSettings.routes.ts`：`GET/PUT /system-settings`（admin）
- `app.ts`：註冊 `/api/v1/system-settings`

**修改**
- `leaveRequest.repository.ts`：`listPendingForApprover` → 改為部門查詢
- `overtimeRequest.repository.ts`：`listPendingForApprover` → 改為部門查詢
- `leave.service.ts`：`allocateAnnualForUser` 納入 `base_bonus_days`、`hours_per_day`、去年結轉；新增 `previewAnnualLeave(year)`、`batchAllocateAnnual(year, overrides)`
- `leave.routes.ts`：新增 `GET /leave/annual-preview`、`POST /leave/annual-allocate`
- `leaveBalance.repository.ts`：`upsertBalance` 擴充支援寫入 `carried_mins`

### Frontend 新增/修改清單

**新增**
- `systemSettings.api.ts`：`useSystemSettings()`、`useUpdateSystemSettings()`
- `AdminSystemSettingsPage.tsx`：系統設定表單（base_bonus_days、hours_per_day）
- `AdminAnnualLeaveAllocationPage.tsx`：年假預覽表格 + 逐筆覆蓋輸入 + 批次配發按鈕
- router：`/admin/system-settings`、`/admin/annual-leave`
- Sidebar：「系統設定」、「年假配發」（admin）

**修改**（無需修改，審核 UI 不變，只改後端查詢範圍）

## Risks / Trade-offs

- **部門為 null 的 manager**：退回 manager_id 查詢，行為與現在相同，不會遺漏
- **去年結轉計算**：以去年 `allocated_mins + carried_mins + adjusted_mins - used_mins` 計算，若為負數則視為 0
- **重複配發**：`upsertBalance` 使用 ON CONFLICT MERGE，重複配發會覆蓋 allocated_mins 與 carried_mins，為有意設計（允許重新配發）

## Migration Plan

1. 新增 migration 建立 `system_settings` 並插入預設一筆（base_bonus_days=0, hours_per_day=8）
2. 後端重啟
3. Rollback：`npm run migrate:rollback`
