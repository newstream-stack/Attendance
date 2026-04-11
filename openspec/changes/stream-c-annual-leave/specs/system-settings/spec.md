## ADDED Requirements

### Requirement: Admin 查看系統設定
Admin SHALL 能查看目前全域系統設定，包含公司加碼年假天數（base_bonus_days）與每日工時（hours_per_day）。

#### Scenario: 查詢系統設定
- **WHEN** Admin 呼叫系統設定查詢 API
- **THEN** 系統回傳目前設定值（base_bonus_days、hours_per_day）

### Requirement: Admin 更新系統設定
Admin SHALL 能更新全域系統設定。`base_bonus_days` 須為非負整數，`hours_per_day` 須為 1–24 的正整數。設定變更後立即生效，影響後續年假預覽與配發計算。

#### Scenario: 成功更新系統設定
- **WHEN** Admin 提交合法的設定值（例如 base_bonus_days=2, hours_per_day=8）
- **THEN** 系統儲存新設定並回傳更新後的設定內容

#### Scenario: 傳入不合法的 hours_per_day
- **WHEN** Admin 提交 hours_per_day=0 或大於 24
- **THEN** 系統回傳 400 Validation Error
