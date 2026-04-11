## ADDED Requirements

### Requirement: Admin 可讀取系統設定
系統 SHALL 提供 `GET /api/v1/system-settings` 端點，所有登入角色皆可存取，回傳當前全域設定值。

#### Scenario: 登入使用者取得系統設定
- **WHEN** 任何角色的已登入使用者呼叫 `GET /api/v1/system-settings`
- **THEN** 系統回傳 200 及 `{ work_start_time, work_end_time, late_tolerance_mins, hours_per_day, base_bonus_days, updated_at }`

### Requirement: Admin 可修改系統設定
系統 SHALL 提供 `PUT /api/v1/system-settings` 端點，僅限 admin 角色，更新全域設定。

#### Scenario: Admin 成功更新設定
- **WHEN** admin 呼叫 `PUT /api/v1/system-settings` 並提供合法參數（`work_start_time: "09:00"`, `work_end_time: "18:00"`, `late_tolerance_mins: 5`, `hours_per_day: 8`, `base_bonus_days: 3`）
- **THEN** 系統回傳 200 及更新後的設定物件

#### Scenario: 非 admin 嘗試修改設定
- **WHEN** manager 或 employee 呼叫 `PUT /api/v1/system-settings`
- **THEN** 系統回傳 403 Forbidden

#### Scenario: 傳入不合法參數
- **WHEN** admin 呼叫 `PUT /api/v1/system-settings` 並傳入 `late_tolerance_mins: -1` 或 `hours_per_day: 0`
- **THEN** 系統回傳 400 Validation Error

### Requirement: 系統設定頁面顯示與編輯
前端 SHALL 提供 `/admin/system-settings` 頁面，僅 admin 可見，顯示並允許修改所有設定欄位。

#### Scenario: 頁面載入顯示當前設定
- **WHEN** admin 進入 `/admin/system-settings`
- **THEN** 頁面顯示表單並填入當前 `work_start_time`、`work_end_time`、`late_tolerance_mins`、`hours_per_day`、`base_bonus_days`

#### Scenario: Admin 儲存設定成功
- **WHEN** admin 修改欄位後點擊「儲存設定」
- **THEN** 系統呼叫 `PUT /api/v1/system-settings`，成功後顯示 toast「設定已更新」
