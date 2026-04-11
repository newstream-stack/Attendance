## Why

目前主管只能審核直屬下屬的請假與加班，無法管理整個部門；年假配發只有後端 API 但無管理介面，Admin 需用 pgAdmin 手動操作，且無法在配發前預覽或調整各員工的天數；系統也缺乏公司加碼年假與工時的統一設定入口。

## What Changes

- 主管假單/加班審核範圍改為整個部門（同 department 欄位）
- 新增年假預覽與批次配發管理頁（Admin）
- 新增系統設定頁（Admin）：公司加碼天數、每日工時
- 年假配發邏輯加入去年餘額全數結轉（carried_mins）與公司加碼
- 新增 `system_settings` DB 表（全域設定）

## Capabilities

### New Capabilities

- `system-settings`: Admin 管理全域系統設定（base_bonus_days、hours_per_day）
- `annual-leave-allocation`: Admin 預覽各員工年假應得天數、逐筆覆蓋、批次配發（含結轉）

### Modified Capabilities

- `leave-approval`: 主管審核範圍從直屬下屬改為整個部門（department 欄位比對）
- `overtime-approval`: 主管審核範圍從直屬下屬改為整個部門（department 欄位比對）

## Impact

- **DB**：新增 migration 建立 `system_settings` 表；`leave_balances.carried_mins` 已存在，upsert 邏輯需擴充寫入此欄位
- **Backend**：修改 `leaveRequest.repository.ts` 與 `overtimeRequest.repository.ts` 的 `listPendingForApprover`；修改 `leave.service.ts` 的 `allocateAnnualAll` 與 `allocateAnnualForUser`；新增 `systemSettings.routes.ts`、`systemSettings.service.ts`、`systemSettings.repository.ts`；新增 `leave.routes.ts` 年假預覽 API
- **Frontend**：新增 `systemSettings.api.ts`、`AdminSystemSettingsPage.tsx`、`AdminAnnualLeaveAllocationPage.tsx`；更新 router 與 Sidebar
