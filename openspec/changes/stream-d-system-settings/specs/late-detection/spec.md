## ADDED Requirements

### Requirement: 打卡時自動判斷遲到
系統 SHALL 於員工打上班卡時，依 `system_settings.work_start_time` 加上 `late_tolerance_mins` 容忍分鐘，判斷是否遲到，並將結果寫入 `attendance_records.is_late`。

#### Scenario: 準時打卡
- **WHEN** 員工於 09:05 打卡，`work_start_time` 為 09:00，`late_tolerance_mins` 為 5
- **THEN** `is_late` 記錄為 `false`（09:05 ≤ 09:00 + 5min）

#### Scenario: 遲到打卡
- **WHEN** 員工於 09:06 打卡，`work_start_time` 為 09:00，`late_tolerance_mins` 為 5
- **THEN** `is_late` 記錄為 `true`（09:06 > 09:00 + 5min）

#### Scenario: 零容忍設定下準時打卡
- **WHEN** 員工於 09:00 打卡，`work_start_time` 為 09:00，`late_tolerance_mins` 為 0
- **THEN** `is_late` 記錄為 `false`

#### Scenario: 零容忍設定下遲到打卡
- **WHEN** 員工於 09:01 打卡，`work_start_time` 為 09:00，`late_tolerance_mins` 為 0
- **THEN** `is_late` 記錄為 `true`

### Requirement: 遲到判斷以 Taipei 時間為基準
系統 SHALL 將打卡時間轉換為 `Asia/Taipei` 時區後，再與 `work_start_time`（TIME 欄位，無時區）比對。

#### Scenario: 伺服器時區與台北時間不同
- **WHEN** 伺服器為 UTC，員工於 UTC 01:05（= Taipei 09:05）打卡，`work_start_time` 為 09:00，`late_tolerance_mins` 為 0
- **THEN** `is_late` 記錄為 `true`（以 Taipei 時間 09:05 判斷）

### Requirement: 報表顯示遲到狀態
前端報表的「出勤紀錄」欄位 SHALL 顯示遲到標記，讓 admin/manager 可一眼識別遲到記錄。

#### Scenario: 報表遲到標記顯示
- **WHEN** admin 查詢出勤報表，某筆記錄 `is_late = true`
- **THEN** 該列顯示「遲到」紅色 Badge

#### Scenario: 準時記錄不顯示標記
- **WHEN** 某筆記錄 `is_late = false`
- **THEN** 該欄顯示「—」或不顯示 Badge
