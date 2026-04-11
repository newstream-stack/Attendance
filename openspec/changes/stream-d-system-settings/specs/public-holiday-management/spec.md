## ADDED Requirements

### Requirement: Admin 可依年份查詢公假列表
系統 SHALL 提供 `GET /api/v1/public-holidays?year=<year>` 端點，所有登入角色可存取，回傳指定年份的公假清單。

#### Scenario: 查詢指定年份公假
- **WHEN** 已登入使用者呼叫 `GET /api/v1/public-holidays?year=2026`
- **THEN** 系統回傳 200 及該年份所有公假陣列（`[{ id, holiday_date, name, year }]`），依日期升冪排列

#### Scenario: 未指定年份時預設為當年
- **WHEN** 已登入使用者呼叫 `GET /api/v1/public-holidays`（不帶 year 參數）
- **THEN** 系統以當年年份查詢並回傳結果

### Requirement: Admin 可新增公假
系統 SHALL 提供 `POST /api/v1/public-holidays` 端點，僅限 admin，新增單筆公假記錄。

#### Scenario: Admin 成功新增公假
- **WHEN** admin 呼叫 `POST /api/v1/public-holidays` 並提供 `{ holiday_date: "2026-01-01", name: "元旦" }`
- **THEN** 系統回傳 201 及新增的公假物件

#### Scenario: 新增重複日期的公假
- **WHEN** admin 新增已存在日期的公假
- **THEN** 系統回傳 409 Conflict

#### Scenario: 非 admin 嘗試新增公假
- **WHEN** manager 或 employee 呼叫 `POST /api/v1/public-holidays`
- **THEN** 系統回傳 403 Forbidden

### Requirement: Admin 可刪除公假
系統 SHALL 提供 `DELETE /api/v1/public-holidays/:id` 端點，僅限 admin，刪除指定公假記錄。

#### Scenario: Admin 成功刪除公假
- **WHEN** admin 呼叫 `DELETE /api/v1/public-holidays/:id`（id 存在）
- **THEN** 系統回傳 204 No Content

#### Scenario: 刪除不存在的公假
- **WHEN** admin 呼叫 `DELETE /api/v1/public-holidays/:id`（id 不存在）
- **THEN** 系統回傳 404 Not Found

### Requirement: 公假管理頁面
前端 SHALL 提供 `/admin/public-holidays` 頁面，僅 admin 可見，顯示當年公假列表，支援切換年份、新增與刪除。

#### Scenario: 頁面載入顯示當年公假
- **WHEN** admin 進入 `/admin/public-holidays`
- **THEN** 頁面顯示當年所有公假，含日期與名稱，依日期升冪排列

#### Scenario: Admin 新增公假
- **WHEN** admin 點擊「新增公假」並填寫日期與名稱後送出
- **THEN** 系統新增成功，列表即時更新，顯示 toast「已新增公假」

#### Scenario: Admin 刪除公假
- **WHEN** admin 點擊某公假的「刪除」並確認
- **THEN** 系統刪除成功，該筆從列表移除，顯示 toast「已刪除公假」
