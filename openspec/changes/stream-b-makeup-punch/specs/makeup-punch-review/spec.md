## ADDED Requirements

### Requirement: Admin 查看待審核補打卡申請
Admin SHALL 能查看所有狀態為 pending 的補打卡申請，包含申請人姓名、員工編號、補打日期、補打類型、補打時間、原因。

#### Scenario: 查詢待審核列表
- **WHEN** Admin 呼叫待審核清單 API
- **THEN** 系統回傳所有 pending 狀態的補打卡申請，依申請時間升冪排列

### Requirement: Admin 審核通過補打卡申請
Admin SHALL 能核准一筆 pending 的補打卡申請，可附上審核意見。審核通過後系統 SHALL 自動更新 attendance_records：
- punch_type=clock_in：若當日無出勤記錄則新增，有則更新 clock_in 欄位
- punch_type=clock_out：找到當日出勤記錄後更新 clock_out 與重新計算 duration_mins；若無上班記錄則仍寫入 clock_out，duration_mins 設為 null

#### Scenario: 核准補上班打卡，當日無出勤記錄
- **WHEN** Admin 核准一筆 punch_type=clock_in 的申請，且當日 attendance_records 無該員工記錄
- **THEN** 申請狀態變為 approved，attendance_records 新增一筆包含 clock_in 時間的記錄

#### Scenario: 核准補下班打卡，當日有上班記錄
- **WHEN** Admin 核准一筆 punch_type=clock_out 的申請，且當日已有 clock_in 記錄
- **THEN** 申請狀態變為 approved，attendance_records 的 clock_out 與 duration_mins 更新

#### Scenario: 核准補下班打卡，當日無上班記錄
- **WHEN** Admin 核准一筆 punch_type=clock_out 的申請，且當日無 clock_in 記錄
- **THEN** 申請狀態變為 approved，attendance_records 新增 clock_out 記錄，duration_mins 為 null

### Requirement: Admin 審核拒絕補打卡申請
Admin SHALL 能拒絕一筆 pending 的補打卡申請，可附上審核意見。拒絕後 attendance_records 不做任何變更。

#### Scenario: 拒絕補打卡申請
- **WHEN** Admin 拒絕一筆 pending 申請並填寫拒絕原因
- **THEN** 申請狀態變為 rejected，attendance_records 不變

### Requirement: Admin 查看所有補打卡申請歷史
Admin SHALL 能查看所有員工的補打卡申請歷史（包含各種狀態），供稽核使用。

#### Scenario: 查詢全部申請歷史
- **WHEN** Admin 呼叫全部申請查詢 API
- **THEN** 系統回傳所有員工的補打卡申請記錄，依建立時間降冪排列
