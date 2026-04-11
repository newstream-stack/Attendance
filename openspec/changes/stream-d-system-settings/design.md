## Context

現有系統上下班時間（09:00 / 18:00）寫死在無任何程式碼中，打卡邏輯只記錄時間不判斷遲到。`public_holidays` 表已存在（供補打卡截止計算使用），但完全沒有前端管理介面，Admin 只能透過 pgAdmin 手動操作。`stream-c-annual-leave` 的設計依賴 `system_settings` 表（`base_bonus_days`、`hours_per_day`），本 change 負責建立此表並擴充為完整系統設定。

## Goals / Non-Goals

**Goals:**
- 建立 `system_settings` 表，包含工作時間、容忍分鐘、年假相關設定（供 stream-c 使用）
- 打卡時自動判斷遲到（比對 `work_start_time + late_tolerance_mins`），寫入 `attendance_records.is_late`
- 提供 Admin 系統設定頁面（CRUD system_settings）
- 提供 Admin 公假管理頁面（`public_holidays` 的 CRUD）
- 報表出勤欄顯示遲到標記

**Non-Goals:**
- 不做早退判斷（下班時間僅供顯示參考，不影響打卡邏輯）
- 不支援員工層級的個別工時設定
- 不自動通知員工遲到
- 不修改已產生的歷史打卡記錄的 `is_late` 值

## Decisions

### D1：system_settings 使用固定欄位單筆表（非 key-value）

```sql
system_settings
  id                   SERIAL PRIMARY KEY   -- 永遠只有 id=1
  work_start_time      TIME NOT NULL DEFAULT '09:00'
  work_end_time        TIME NOT NULL DEFAULT '18:00'
  late_tolerance_mins  INTEGER NOT NULL DEFAULT 0
  hours_per_day        INTEGER NOT NULL DEFAULT 8
  base_bonus_days      INTEGER NOT NULL DEFAULT 0
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

**理由**：欄位型別明確、Zod schema 直接對應、不需動態 key 解析。Migration 插入預設一筆（id=1），`updateSettings` 固定 `WHERE id = 1`。

### D2：遲到判斷在 clockInService 中進行

```
clockInService(userId, ipAddress):
  1. IP 白名單驗證
  2. 取得今日 Taipei 日期
  3. 檢查重複打卡
  4. 取得 system_settings（work_start_time, late_tolerance_mins）
  5. 計算遲到：clock_in 的 Taipei 時間 > work_start_time + late_tolerance_mins？
  6. clockIn(userId, workDate, ipAddress, isLate) 寫入 DB
```

**理由**：遲到判斷是打卡時的業務邏輯，屬於 service 層職責。Repository 只負責接受 `is_late` 值並寫入，不做判斷。

### D3：公假管理 API 新建 publicHoliday.routes.ts

`public_holidays` 表已存在，目前無任何 API。新增：
- `GET /public-holidays?year=2026`（all roles，供補打卡截止計算）
- `POST /public-holidays`（admin，新增單筆）
- `DELETE /public-holidays/:id`（admin，刪除單筆）

**不支援批次匯入**（範圍外），前端提供逐筆新增 Dialog。

### D4：system_settings GET 開放所有登入角色讀取

前端員工端打卡頁可能需要顯示標準上下班時間，因此 `GET /system-settings` 開放給所有登入者，`PUT /system-settings` 僅限 admin。

### Backend 新增/修改清單

**新增**
- `systemSettings.repository.ts`：`getSettings()`、`updateSettings(data)`
- `systemSettings.service.ts`：`getSettings()`、`updateSettings(data)`
- `systemSettings.routes.ts`：`GET /system-settings`（all roles）、`PUT /system-settings`（admin，Zod 驗證）
- `publicHoliday.repository.ts`：`listByYear(year)`、`create(data)`、`remove(id)`
- `publicHoliday.service.ts`：`listByYear(year)`、`create(data)`、`remove(id)`
- `publicHoliday.routes.ts`：`GET /public-holidays`、`POST /public-holidays`、`DELETE /public-holidays/:id`
- `app.ts`：註冊兩個新 router

**修改**
- migration：新增 `attendance_records.is_late BOOLEAN NOT NULL DEFAULT FALSE`
- `attendance.repository.ts` 的 `clockIn`：新增 `is_late` 參數
- `attendance.service.ts` 的 `clockInService`：加入遲到判斷邏輯（查 system_settings）
- `types/index.ts`：`AttendanceRecord` 加 `is_late` 欄位；新增 `SystemSettings`、`PublicHoliday` 型別

### Frontend 新增/修改清單

**新增**
- `systemSettings.api.ts`：`useSystemSettings()`、`useUpdateSystemSettings()`
- `publicHoliday.api.ts`：`usePublicHolidays(year)`、`useCreatePublicHoliday()`、`useDeletePublicHoliday()`
- `AdminSystemSettingsPage.tsx`：系統設定表單（全部欄位）
- `AdminPublicHolidaysPage.tsx`：公假列表 + 新增 Dialog + 刪除確認

**修改**
- `AdminReportsPage.tsx`：出勤欄新增「遲到」欄（`is_late` badge）
- `router.tsx`：新增 `/admin/system-settings`、`/admin/public-holidays`
- `Sidebar.tsx`：Admin 區新增「系統設定」、「公假管理」

## Risks / Trade-offs

- **時區遲到計算**：`clock_in` 存為 TIMESTAMPTZ，需轉換為 Taipei 時間（`Asia/Taipei`）後與 `work_start_time` 比對。使用 `new Date(clockIn).toLocaleTimeString('en-GB', { timeZone: 'Asia/Taipei' })` 取得本地時間字串比對。
- **歷史資料 is_late 預設 false**：Migration 加欄位時 DEFAULT FALSE，舊記錄不會回填，為有意設計。
- **system_settings 快取**：每次打卡都查一次 DB，系統設定幾乎不變，但此頻率可接受（無需快取層）。

## Migration Plan

1. 新增 migration（單一檔案）：
   - 建立 `system_settings` 表並插入預設一筆（id=1）
   - `attendance_records` 加 `is_late BOOLEAN NOT NULL DEFAULT FALSE`
2. `npm run migrate` 套用
3. 後端重啟
4. Rollback：`npm run migrate:rollback`
