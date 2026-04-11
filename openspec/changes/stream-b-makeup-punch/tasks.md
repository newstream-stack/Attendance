## 1. DB Migration

- [x] 1.1 建立 migration 檔：新增 `makeup_punch_rules` 表（id SERIAL, deadline_working_days, reason_required, updated_at）並插入預設一筆記錄
- [x] 1.2 在同一 migration 新增 `makeup_punch_requests` 表（id UUID, user_id, work_date, punch_type, requested_time, reason, status, reviewed_by, review_comment, reviewed_at, created_at, updated_at）
- [x] 1.3 執行 `npm run migrate` 套用 migration

## 2. Backend — Repository

- [x] 2.1 建立 `makeupPunch.repository.ts`：`getRules()`、`updateRules(data)`
- [x] 2.2 在 `makeupPunch.repository.ts` 新增 `createRequest(data)`
- [x] 2.3 在 `makeupPunch.repository.ts` 新增 `findRequestById(id)`
- [x] 2.4 在 `makeupPunch.repository.ts` 新增 `listRequestsByUser(userId)`
- [x] 2.5 在 `makeupPunch.repository.ts` 新增 `listAllRequests()`
- [x] 2.6 在 `makeupPunch.repository.ts` 新增 `listPendingRequests()`
- [x] 2.7 在 `makeupPunch.repository.ts` 新增 `updateRequestStatus(id, status, reviewedBy, comment)`
- [x] 2.8 在 `makeupPunch.repository.ts` 新增 `findDuplicateRequest(userId, workDate, punchType)`
- [x] 2.9 在 `attendance.repository.ts` 新增 `upsertClockIn(userId, workDate, clockInTime)`
- [x] 2.10 在 `attendance.repository.ts` 新增 `updateClockOut(userId, workDate, clockOutTime)`

## 3. Backend — Service

- [x] 3.1 建立 `makeupPunch.service.ts`：`getRules()`、`updateRules(data)`
- [x] 3.2 在 `makeupPunch.service.ts` 新增截止日計算工具函式 `calcDeadline(workDate, deadlineDays)`（復用 public_holidays + 週末判斷）
- [x] 3.3 在 `makeupPunch.service.ts` 新增 `submitRequest(userId, data)`（含截止日驗證、重複申請驗證）
- [x] 3.4 在 `makeupPunch.service.ts` 新增 `listMyRequests(userId)`
- [x] 3.5 在 `makeupPunch.service.ts` 新增 `listAllRequests()`
- [x] 3.6 在 `makeupPunch.service.ts` 新增 `listPendingRequests()`
- [x] 3.7 在 `makeupPunch.service.ts` 新增 `approveRequest(id, adminId, comment)`（含 upsert attendance_records 邏輯）
- [x] 3.8 在 `makeupPunch.service.ts` 新增 `rejectRequest(id, adminId, comment)`
- [x] 3.9 在 `makeupPunch.service.ts` 新增 `cancelRequest(id, userId)`

## 4. Backend — Routes

- [x] 4.1 建立 `makeupPunch.routes.ts`：`GET /makeup-punch/rules`、`PUT /makeup-punch/rules`（admin）
- [x] 4.2 在 `makeupPunch.routes.ts` 新增 `POST /makeup-punch/requests`（含 Zod schema 驗證）
- [x] 4.3 在 `makeupPunch.routes.ts` 新增 `GET /makeup-punch/requests`（employee 自己、admin 全部）
- [x] 4.4 在 `makeupPunch.routes.ts` 新增 `GET /makeup-punch/requests/pending`（admin）
- [x] 4.5 在 `makeupPunch.routes.ts` 新增 `POST /makeup-punch/requests/:id/approve`（admin）
- [x] 4.6 在 `makeupPunch.routes.ts` 新增 `POST /makeup-punch/requests/:id/reject`（admin）
- [x] 4.7 在 `makeupPunch.routes.ts` 新增 `POST /makeup-punch/requests/:id/cancel`（employee）
- [x] 4.8 在 `app.ts` 引入並註冊 `makeupPunchRouter`（`/api/v1/makeup-punch`）

## 5. Frontend — API Hooks

- [x] 5.1 建立 `makeupPunch.api.ts`：定義 `MakeupPunchRequest`、`MakeupPunchRules` TypeScript 介面
- [x] 5.2 在 `makeupPunch.api.ts` 新增 `useMakeupPunchRules()`、`useUpdateMakeupPunchRules()`
- [x] 5.3 在 `makeupPunch.api.ts` 新增 `useMyMakeupPunchRequests()`
- [x] 5.4 在 `makeupPunch.api.ts` 新增 `useAllMakeupPunchRequests()`、`usePendingMakeupPunchRequests()`
- [x] 5.5 在 `makeupPunch.api.ts` 新增 `useSubmitMakeupPunchRequest()`
- [x] 5.6 在 `makeupPunch.api.ts` 新增 `useApproveMakeupPunchRequest()`、`useRejectMakeupPunchRequest()`
- [x] 5.7 在 `makeupPunch.api.ts` 新增 `useCancelMakeupPunchRequest()`

## 6. Frontend — Pages

- [x] 6.1 建立 `MakeupPunchApplyPage.tsx`（員工補打卡申請表單：選日期、類型、時間、原因）
- [x] 6.2 建立 `MakeupPunchHistoryPage.tsx`（員工補打卡記錄列表，含取消功能）
- [x] 6.3 建立 `AdminMakeupPunchReviewPage.tsx`（Admin 待審核列表，含核准/拒絕 Dialog）
- [x] 6.4 建立 `AdminMakeupPunchRulesPage.tsx`（Admin 補打卡規則設定表單）

## 7. Frontend — Router & Sidebar

- [x] 7.1 在 `router.tsx` 新增 4 條路由：`/makeup-punch/apply`、`/makeup-punch/history`、`/admin/makeup-punch/review`、`/admin/makeup-punch/rules`
- [x] 7.2 在 `Sidebar.tsx` 員工區新增「補打卡申請」、「補打卡記錄」導覽項目
- [x] 7.3 在 `Sidebar.tsx` 管理者區新增「補打卡審核」（roles: admin）、「補打卡規則」（roles: admin）導覽項目
