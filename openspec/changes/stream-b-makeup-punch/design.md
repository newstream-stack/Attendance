## Context

目前出勤紀錄（`attendance_records`）只能透過打卡 API 寫入，無員工自助補打卡機制。Admin 需手動操作 DB 修正缺漏打卡，維運成本高且缺乏稽核軌跡。本次新增補打卡申請流程，審核通過後自動更新出勤紀錄，並保留完整申請/審核歷史。

## Goals / Non-Goals

**Goals:**
- 員工可申請補上班或補下班打卡，需填寫說明
- 申請截止為隔天起算的第 1 個工作日（利用現有 `public_holidays` + 週末判斷）
- Admin 單一層級審核，通過後自動寫入 `attendance_records`
- Admin 可在規則頁調整截止工作日天數與是否強制填說明

**Non-Goals:**
- 不支援 Manager 審核（單一 Admin 層級）
- 不支援附件上傳
- 不支援每月次數限制
- 不自動發送 Email 通知

## Decisions

### D1：補打卡規則存單筆全域設定表（非 JSON config）

選擇新增 `makeup_punch_rules` 表（保證只有一筆），而非存入 `system_settings` JSON 欄位。

**理由**：欄位明確、型別安全、未來擴充欄位時有 migration 稽核軌跡。

### D2：申請截止判斷在後端 service 層執行

送出申請時，service 即時計算 `work_date` 的截止工作日並與 `NOW()` 比較，拒絕逾期申請。

**理由**：前端顯示截止日僅供參考，實際驗證必須在後端，避免客戶端繞過。

### D3：審核通過後直接 upsert attendance_records

通過審核時，service 判斷 `punch_type`：
- `clock_in`：若當日無記錄則 INSERT，有記錄則 UPDATE `clock_in`
- `clock_out`：找到當日記錄後 UPDATE `clock_out` 與 `duration_mins`

**理由**：不新增中間表，直接維護既有出勤紀錄，報表查詢不受影響。

### D4：補打卡記錄（employee）與審核（admin）共用同一 API，以角色過濾

- `GET /makeup-punch/requests` — employee 只看自己；admin 看全部
- `GET /makeup-punch/requests/pending` — admin only

### DB Schema

```sql
-- 全域規則（只有一筆，id 固定為 1）
makeup_punch_rules
  id                    SERIAL PRIMARY KEY
  deadline_working_days INTEGER NOT NULL DEFAULT 1
  reason_required       BOOLEAN NOT NULL DEFAULT TRUE
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- 申請記錄
makeup_punch_requests
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id         UUID NOT NULL REFERENCES users(id)
  work_date       DATE NOT NULL
  punch_type      VARCHAR(10) NOT NULL CHECK (punch_type IN ('clock_in','clock_out'))
  requested_time  TIME NOT NULL
  reason          TEXT
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','cancelled'))
  reviewed_by     UUID REFERENCES users(id)
  review_comment  TEXT
  reviewed_at     TIMESTAMPTZ
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### Backend 新增清單

**Routes** — `makeupPunch.routes.ts`
- `GET    /makeup-punch/rules` — 取得規則（all roles）
- `PUT    /makeup-punch/rules` — 更新規則（admin）
- `POST   /makeup-punch/requests` — 員工送出申請
- `GET    /makeup-punch/requests` — 查詢申請列表（employee: 自己；admin: 全部）
- `GET    /makeup-punch/requests/pending` — 待審核列表（admin）
- `POST   /makeup-punch/requests/:id/approve` — 審核通過（admin）
- `POST   /makeup-punch/requests/:id/reject` — 審核拒絕（admin）
- `POST   /makeup-punch/requests/:id/cancel` — 取消申請（employee，限 pending）

**Service** — `makeupPunch.service.ts`
- `getRules()`
- `updateRules(data)`
- `submitRequest(userId, data)` — 含截止日驗證
- `listRequests(userId, role)` — 角色過濾
- `listPending()` — admin only
- `approveRequest(id, adminId, comment)` — 含 upsert attendance_records
- `rejectRequest(id, adminId, comment)`
- `cancelRequest(id, userId)`

**Repository** — `makeupPunch.repository.ts`
- CRUD for `makeup_punch_rules` and `makeup_punch_requests`

**attendance.repository.ts 擴充**
- `upsertClockIn(userId, workDate, clockInTime)` — INSERT or UPDATE clock_in
- `updateClockOut(userId, workDate, clockOutTime, durationMins)` — UPDATE clock_out

### Frontend 新增清單

**API** — `makeupPunch.api.ts`
- `useMakeupPunchRules()`、`useUpdateMakeupPunchRules()`
- `useMyMakeupPunchRequests()`、`useAllMakeupPunchRequests()`
- `usePendingMakeupPunchRequests()`
- `useSubmitMakeupPunchRequest()`
- `useApproveMakeupPunchRequest()`、`useRejectMakeupPunchRequest()`、`useCancelMakeupPunchRequest()`

**Pages**
- `MakeupPunchApplyPage.tsx` — 員工申請補打卡
- `MakeupPunchHistoryPage.tsx` — 員工補打卡記錄
- `AdminMakeupPunchReviewPage.tsx` — Admin 審核列表
- `AdminMakeupPunchRulesPage.tsx` — Admin 規則設定

**Router** — 新增 4 條路由
- `/makeup-punch/apply`
- `/makeup-punch/history`
- `/admin/makeup-punch/review`
- `/admin/makeup-punch/rules`

**Sidebar** — 新增 4 個 nav items
- 員工區：補打卡申請、補打卡記錄
- 管理者區：補打卡審核（admin）、補打卡規則（admin）

## Risks / Trade-offs

- **同一天重複申請**：同一員工同一天同類型（clock_in/clock_out）可能重複送出 → service 層需檢查是否已有 pending/approved 申請，若有則拒絕
- **審核通過後 clock_out 無對應 clock_in**：補下班打卡時若當日無上班記錄，duration_mins 無法計算 → service 警示但仍允許寫入，duration_mins 設為 null
- **截止日計算依賴 public_holidays 資料**：若假日資料未維護，截止日計算可能偏差 → 為已知限制，文件說明

## Migration Plan

1. 執行新 migration 建立兩張表並插入預設規則一筆
2. 後端重啟（ts-node-dev 自動重載）
3. 前端 dev server 自動 HMR
4. Rollback：執行 `npm run migrate:rollback` 回滾 migration
