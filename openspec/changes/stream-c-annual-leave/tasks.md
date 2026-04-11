## 1. DB Migration

- [ ] 1.1 建立 migration 檔：新增 `system_settings` 表（id SERIAL, base_bonus_days INTEGER DEFAULT 0, hours_per_day INTEGER DEFAULT 8, updated_at）並插入預設一筆記錄（id=1）
- [ ] 1.2 執行 `npm run migrate` 套用 migration

## 2. Backend — System Settings

- [ ] 2.1 建立 `systemSettings.repository.ts`：`getSettings()`、`updateSettings(data)`
- [ ] 2.2 建立 `systemSettings.service.ts`：`getSettings()`、`updateSettings(data)`
- [ ] 2.3 建立 `systemSettings.routes.ts`：`GET /system-settings`（all roles）、`PUT /system-settings`（admin，含 Zod 驗證）
- [ ] 2.4 在 `app.ts` 引入並註冊 `systemSettingsRouter`（`/api/v1/system-settings`）

## 3. Backend — 主管審核範圍改為部門

- [ ] 3.1 修改 `leaveRequest.repository.ts` 的 `listPendingForApprover`：改為 JOIN approver 表，以 department 欄位查詢同部門員工（department 為 null 時退回 manager_id 查詢）
- [ ] 3.2 修改 `overtimeRequest.repository.ts` 的 `listPendingForApprover`：同上邏輯

## 4. Backend — 年假配發邏輯擴充

- [ ] 4.1 修改 `leaveBalance.repository.ts` 的 `upsertBalance`：擴充參數支援傳入 `carried_mins`，寫入時一併更新此欄位
- [ ] 4.2 在 `leave.service.ts` 新增 `previewAnnualLeave(year)`：查詢所有在職員工，計算 statutory_days、bonus_days、carried_days、total_days，回傳預覽陣列（不寫 DB）
- [ ] 4.3 修改 `leave.service.ts` 的 `allocateAnnualForUser`：納入 `base_bonus_days`、`hours_per_day`（從 system_settings 取得）、去年剩餘結轉（查詢去年 leave_balance 計算 carried_mins）
- [ ] 4.4 在 `leave.service.ts` 新增 `batchAllocateAnnual(year, overrides)`：依 overrides 覆蓋對應員工天數，其餘用公式，逐一呼叫 allocateAnnualForUser（或直接 upsert）

## 5. Backend — Routes 擴充

- [ ] 5.1 在 `leave.routes.ts` 新增 `GET /leave/annual-preview`（admin，query: year）
- [ ] 5.2 在 `leave.routes.ts` 新增 `POST /leave/annual-allocate`（admin，含 Zod 驗證 year + overrides 陣列）

## 6. Frontend — System Settings

- [ ] 6.1 建立 `systemSettings.api.ts`：`useSystemSettings()`、`useUpdateSystemSettings()`
- [ ] 6.2 建立 `AdminSystemSettingsPage.tsx`：系統設定表單（base_bonus_days、hours_per_day）

## 7. Frontend — 年假配發頁面

- [ ] 7.1 在 `leave.api.ts`（或新增 `annualLeave.api.ts`）新增 `useAnnualLeavePreview(year)`
- [ ] 7.2 在 `leave.api.ts` 新增 `useBatchAllocateAnnualLeave()`
- [ ] 7.3 建立 `AdminAnnualLeaveAllocationPage.tsx`：年假預覽表格（顯示各欄位）、逐筆覆蓋天數輸入欄、批次配發按鈕、調整個別員工額度（呼叫現有 adjust API）

## 8. Frontend — Router & Sidebar

- [ ] 8.1 在 `router.tsx` 新增 `/admin/system-settings` 路由（對應 `AdminSystemSettingsPage`）
- [ ] 8.2 在 `router.tsx` 新增 `/admin/annual-leave` 路由（對應 `AdminAnnualLeaveAllocationPage`）
- [ ] 8.3 在 `Sidebar.tsx` 管理者區新增「系統設定」導覽項目（roles: admin）
- [ ] 8.4 在 `Sidebar.tsx` 管理者區新增「年假配發」導覽項目（roles: admin）
