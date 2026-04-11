## Why

員工因故未能正常打卡（上班或下班）時，目前系統無法申請補打卡，造成出勤紀錄缺漏，需由管理員手動修正資料庫，維運成本高。補打卡申請功能讓員工自助提出申請、Admin 集中審核，審核通過後自動更新出勤紀錄。

## What Changes

- 新增補打卡申請流程（員工申請 → Admin 審核 → 自動寫入出勤紀錄）
- 新增補打卡規則設定（Admin 可設定申請截止期限）
- 員工 Sidebar 加入「補打卡申請」、「補打卡記錄」
- 管理者 Sidebar 加入「補打卡審核」、「補打卡規則」

## Capabilities

### New Capabilities

- `makeup-punch-request`: 員工補打卡申請與記錄查詢（支援補上班/下班打卡，需填說明，截止隔天上班日）
- `makeup-punch-review`: Admin 審核補打卡申請，審核通過自動寫入/修正 attendance_records
- `makeup-punch-rules`: Admin 管理全域補打卡規則（deadline_working_days、reason_required）

### Modified Capabilities

- `attendance`: 補打卡審核通過後，attendance_records 需支援寫入補打卡時間（已有 clock_in/clock_out 欄位，無 schema 異動，僅新增寫入路徑）

## Impact

- **DB**：新增 2 張表（migration）：`makeup_punch_rules`、`makeup_punch_requests`
- **Backend**：新增 `makeupPunch.routes.ts`、`makeupPunch.service.ts`、`makeupPunch.repository.ts`；擴充 `attendance.repository.ts` 支援 admin 直接更新打卡時間
- **Frontend**：新增 `makeupPunch.api.ts`、4 個頁面（申請、記錄、審核、規則）、更新 router 與 Sidebar
- **Dependencies**：復用現有 `public_holidays` 表與 `workingDays.ts` 計算截止工作日
