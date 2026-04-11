## Why

系統目前缺乏統一的全域設定入口：上下班標準時間寫死於程式碼中無法調整、遲到/早退未被記錄、公假資料（`public_holidays` 表）只能透過 pgAdmin 手動管理、`stream-c` 所需的年假相關設定（加碼天數、每日工時）也無前端介面。

## What Changes

- 新增 `system_settings` 表（全域設定，永遠只有一筆 id=1）
  - `work_start_time` — 標準上班時間（TIME，預設 09:00）
  - `work_end_time` — 標準下班時間（TIME，預設 18:00）
  - `late_tolerance_mins` — 遲到容忍分鐘（INT，預設 0）
  - `hours_per_day` — 每日工時（INT，預設 8）（供 stream-c 使用）
  - `base_bonus_days` — 年假公司加碼天數（INT，預設 0）（供 stream-c 使用）
- 打卡時比對 `work_start_time + late_tolerance_mins`，在 `attendance_records` 新增 `is_late BOOLEAN` 欄位記錄遲到狀態
- 新增 `/admin/system-settings` 頁面（Admin），管理上述全域設定
- 新增 `/admin/public-holidays` 頁面（Admin），管理 `public_holidays` 表（CRUD）
- 報表「出勤紀錄」新增遲到欄位顯示

## Capabilities

### New Capabilities

- `system-settings`: Admin 管理全域系統設定（工作時間、容忍分鐘、每日工時、年假加碼）
- `public-holiday-management`: Admin 管理公假日曆（新增、刪除，依年份篩選）
- `late-detection`: 打卡時自動判斷是否遲到，記錄於 `attendance_records.is_late`，報表顯示

### Modified Capabilities

（無現有 spec 需修改）

## Impact

- **DB**：新增 migration 建立 `system_settings`（含預設一筆）；`attendance_records` 新增 `is_late BOOLEAN` 欄位
- **Backend**：新增 `systemSettings.repository.ts / service.ts / routes.ts`；新增 `publicHoliday.routes.ts`（現有 public_holidays 表已存在，補 API）；修改 `attendance.service.ts` 的 `clockInService` 加入遲到判斷邏輯
- **Frontend**：新增 `systemSettings.api.ts`、`publicHoliday.api.ts`、`AdminSystemSettingsPage.tsx`、`AdminPublicHolidaysPage.tsx`；更新 router、Sidebar、`AdminReportsPage.tsx`（加遲到欄）
- **stream-c 依賴**：`stream-c-annual-leave` 的 system_settings 相關 tasks 刪除，改為依賴本 change 建立的表與 API
