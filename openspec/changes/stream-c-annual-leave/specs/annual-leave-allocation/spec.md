## ADDED Requirements

### Requirement: Admin 預覽年假配發計算結果
Admin SHALL 能查看指定年度所有在職員工的年假應得天數預覽，包含法定天數（勞基法）、公司加碼天數、去年剩餘結轉天數與合計天數，且不寫入資料庫。

#### Scenario: 查詢年假預覽
- **WHEN** Admin 呼叫年假預覽 API 並指定年度
- **THEN** 系統回傳所有在職員工的預覽清單，包含 statutory_days、bonus_days、carried_days、total_days

#### Scenario: 員工年資不足 6 個月
- **WHEN** 預覽時某員工到職未滿 6 個月
- **THEN** 該員工 statutory_days 為 0，total_days 僅含 carried_days（若有）

### Requirement: Admin 批次配發年假
Admin SHALL 能針對指定年度執行批次年假配發，可在送出時附上個別員工的覆蓋天數。系統 SHALL 依下列優先序計算每位員工的 allocated_mins：覆蓋值（若有）> 公式結果（法定 + 加碼）。去年剩餘全數寫入 carried_mins。

#### Scenario: 批次配發（無個人覆蓋）
- **WHEN** Admin 執行批次配發且未提供任何 override
- **THEN** 所有在職員工的 leave_balances 寫入公式計算的 allocated_mins 與 carried_mins

#### Scenario: 批次配發（含個人覆蓋）
- **WHEN** Admin 執行批次配發並對特定員工指定 allocated_days 覆蓋值
- **THEN** 該員工以覆蓋值計算 allocated_mins，其他員工以公式結果計算，carried_mins 皆以去年剩餘全數計算

#### Scenario: 重複配發同一年度
- **WHEN** Admin 對已配發的年度再次執行批次配發
- **THEN** 系統以新計算結果覆蓋原有 allocated_mins 與 carried_mins（upsert 行為）

### Requirement: Admin 事後調整個別員工年假餘額
Admin SHALL 能在配發後針對個別員工手動調整年假的 adjusted_mins（調整額度），用於特殊情況補發或扣除。

#### Scenario: 調整個別員工年假額度
- **WHEN** Admin 指定某員工的 leave_balance id 並輸入 adjusted_mins 值（可為負數）
- **THEN** 系統更新該筆 leave_balance 的 adjusted_mins
