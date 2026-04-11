## MODIFIED Requirements

### Requirement: 主管查詢待審核請假申請
主管（manager 角色）SHALL 能查看待審核的請假申請。查詢範圍 SHALL 為與主管同部門（department 欄位相同）的所有員工，但不含主管本人。若主管的 department 欄位為 null，則退回查詢直屬下屬（manager_id = 主管 id）。

#### Scenario: 主管有部門，查詢同部門待審請假
- **WHEN** 有部門的主管呼叫待審核請假列表 API
- **THEN** 系統回傳同部門所有員工（不含主管本人）的 pending 請假申請

#### Scenario: 主管無部門設定，退回直屬下屬查詢
- **WHEN** department 為 null 的主管呼叫待審核請假列表 API
- **THEN** 系統回傳以 manager_id 為條件的 pending 請假申請（原有行為）
