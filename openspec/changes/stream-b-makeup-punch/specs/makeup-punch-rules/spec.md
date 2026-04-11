## ADDED Requirements

### Requirement: Admin 查看補打卡規則
Admin SHALL 能查看目前全域補打卡規則設定，包含截止工作日天數與是否強制填說明。

#### Scenario: 查詢規則
- **WHEN** 任何已登入使用者呼叫規則查詢 API
- **THEN** 系統回傳目前規則（deadline_working_days、reason_required）

### Requirement: Admin 更新補打卡規則
Admin SHALL 能更新全域補打卡規則。`deadline_working_days` 須為正整數，`reason_required` 為布林值。規則變更後立即生效，影響後續所有新申請的截止判斷。

#### Scenario: 成功更新規則
- **WHEN** Admin 提交合法的規則更新（例如 deadline_working_days=2）
- **THEN** 系統儲存新規則並回傳更新後的規則內容

#### Scenario: 傳入不合法的 deadline_working_days
- **WHEN** Admin 提交 deadline_working_days=0 或負數
- **THEN** 系統回傳 400 Validation Error
