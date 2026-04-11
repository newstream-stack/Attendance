## 1. DB Migration

- [ ] 1.1 建立 migration 檔：新增 `system_settings` 表（`work_start_time TIME DEFAULT '09:00'`、`work_end_time TIME DEFAULT '18:00'`、`late_tolerance_mins INT DEFAULT 0`、`hours_per_day INT DEFAULT 8`、`base_bonus_days INT DEFAULT 0`、`updated_at TIMESTAMPTZ`）並插入預設一筆（id=1）
- [ ] 1.2 在同一 migration 檔中，`attendance_records` 加入 `is_late BOOLEAN NOT NULL DEFAULT FALSE` 欄位
- [ ] 1.3 執行 `npm run migrate` 套用 migration

## 2. Backend — Types

- [ ] 2.1 在 `backend/src/types/index.ts` 新增 `SystemSettings` 型別（含所有欄位）
- [ ] 2.2 在 `backend/src/types/index.ts` 新增 `PublicHoliday` 型別；`AttendanceRecord` 加入 `is_late: boolean` 欄位

## 3. Backend — System Settings

- [ ] 3.1 建立 `systemSettings.repository.ts`：`getSettings()`（查 id=1）、`updateSettings(data)`（UPDATE WHERE id=1，回傳更新後資料）
- [ ] 3.2 建立 `systemSettings.service.ts`：`getSettings()`、`updateSettings(data)`（委派 repository）
- [ ] 3.3 建立 `systemSettings.routes.ts`：`GET /system-settings`（authMiddleware，all roles）、`PUT /system-settings`（requireRole('admin')，Zod 驗證所有欄位）
- [ ] 3.4 在 `app.ts` 引入並註冊 `systemSettingsRouter`（`/api/v1/system-settings`）

## 4. Backend — Public Holiday

- [ ] 4.1 建立 `publicHoliday.repository.ts`：`listByYear(year)`（依 year 查詢，依 holiday_date 升冪）、`create(data)`（INSERT，衝突回拋錯誤）、`remove(id)`（DELETE，不存在回傳 undefined）
- [ ] 4.2 建立 `publicHoliday.service.ts`：`listByYear(year)`、`create(data)`（衝突拋 AppError 409）、`remove(id)`（找不到拋 AppError 404）
- [ ] 4.3 建立 `publicHoliday.routes.ts`：`GET /public-holidays`（authMiddleware，query: year 選填）、`POST /public-holidays`（requireRole('admin')，Zod 驗證 holiday_date + name）、`DELETE /public-holidays/:id`（requireRole('admin')）
- [ ] 4.4 在 `app.ts` 引入並註冊 `publicHolidayRouter`（`/api/v1/public-holidays`）

## 5. Backend — 遲到判斷

- [ ] 5.1 修改 `attendance.repository.ts` 的 `clockIn()`：新增 `isLate: boolean` 參數，INSERT 時帶入 `is_late` 欄位
- [ ] 5.2 修改 `attendance.service.ts` 的 `clockInService()`：呼叫 `getSettings()` 取得 `work_start_time` 與 `late_tolerance_mins`；將打卡時間轉為 Taipei 時間後計算是否遲到；將 `isLate` 傳入 `clockIn()`

## 6. Frontend — System Settings

- [ ] 6.1 建立 `systemSettings.api.ts`：定義 `SystemSettings` 型別；`useSystemSettings()`（GET /system-settings）；`useUpdateSystemSettings()`（PUT /system-settings，invalidate query）
- [ ] 6.2 建立 `AdminSystemSettingsPage.tsx`：表單含 `work_start_time`（time input）、`work_end_time`（time input）、`late_tolerance_mins`（number input，min 0）、`hours_per_day`（number input，min 1）、`base_bonus_days`（number input，min 0）；載入時 reset 表單為當前設定值；送出呼叫 `useUpdateSystemSettings`，成功顯示 toast

## 7. Frontend — Public Holiday

- [ ] 7.1 建立 `publicHoliday.api.ts`：定義 `PublicHoliday` 型別；`usePublicHolidays(year)`（GET /public-holidays?year=year）；`useCreatePublicHoliday()`（POST，invalidate）；`useDeletePublicHoliday()`（DELETE，invalidate）
- [ ] 7.2 建立 `AdminPublicHolidaysPage.tsx`：年份選擇器（預設當年）；DataTable 顯示公假列表（holiday_date、name、刪除按鈕）；「新增公假」Dialog（日期 + 名稱欄位）；刪除使用 ConfirmDialog

## 8. Frontend — 報表遲到欄位

- [ ] 8.1 修改 `AdminReportsPage.tsx`：出勤紀錄 columns 新增「遲到」欄，`is_late === true` 顯示紅色「遲到」Badge，否則顯示「—」

## 9. Frontend — Router & Sidebar

- [ ] 9.1 在 `router.tsx` 新增 `/admin/system-settings` 路由（對應 `AdminSystemSettingsPage`）
- [ ] 9.2 在 `router.tsx` 新增 `/admin/public-holidays` 路由（對應 `AdminPublicHolidaysPage`）
- [ ] 9.3 在 `Sidebar.tsx` Admin 區新增「系統設定」導覽項目（`/admin/system-settings`，roles: admin）
- [ ] 9.4 在 `Sidebar.tsx` Admin 區新增「公假管理」導覽項目（`/admin/public-holidays`，roles: admin）
