## ADDED Requirements

### Requirement: 員工送出補打卡申請
員工 SHALL 能申請補上班打卡或補下班打卡，需指定補打日期、補打類型（clock_in/clock_out）、補打時間，以及說明原因。系統 SHALL 驗證申請是否在截止期限內（work_date 起算第 N 個工作日結束前，N 由規則設定），逾期 SHALL 拒絕。同一員工同一天同類型若已有 pending 或 approved 申請，SHALL 拒絕重複申請。

#### Scenario: 成功送出補上班打卡申請
- **WHEN** 員工在截止期限內，針對某工作日送出 punch_type=clock_in、有填寫原因的申請
- **THEN** 系統建立狀態為 pending 的補打卡申請，回傳 201

#### Scenario: 超過截止期限
- **WHEN** 員工申請的 work_date 距今已超過規則設定的截止工作日數
- **THEN** 系統回傳 400，訊息說明申請已逾期

#### Scenario: 重複申請同類型
- **WHEN** 員工對同一 work_date 同一 punch_type 已有 pending 或 approved 申請，再次送出
- **THEN** 系統回傳 409，拒絕重複申請

### Requirement: 員工查詢自己的補打卡記錄
員工 SHALL 能查看自己所有補打卡申請的歷史記錄，包含狀態、審核意見。

#### Scenario: 查詢補打卡記錄
- **WHEN** 員工呼叫查詢 API
- **THEN** 系統回傳該員工所有補打卡申請，依建立時間降冪排列

### Requirement: 員工取消待審中的補打卡申請
員工 SHALL 能取消狀態為 pending 的補打卡申請。已審核（approved/rejected）的申請 SHALL 不得取消。

#### Scenario: 成功取消 pending 申請
- **WHEN** 員工取消一筆自己的 pending 申請
- **THEN** 申請狀態變更為 cancelled

#### Scenario: 嘗試取消已審核申請
- **WHEN** 員工嘗試取消狀態為 approved 或 rejected 的申請
- **THEN** 系統回傳 400，拒絕操作
