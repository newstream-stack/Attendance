## Why

出缺勤管理系統目前尚無任何程式碼基礎，需要從零建立完整的專案骨架，讓後續各功能 Stream（認證、打卡、請假、加班）能在一致的技術架構上開發。

## What Changes

- 建立 Docker Compose 環境，一鍵啟動 postgres、pgAdmin、backend、frontend、MailHog 五個服務
- 建立 PostgreSQL 所有核心資料表（Schema + Seed）：users、attendance_records、leave_types、leave_balances、leave_requests、leave_approvals、overtime_requests、overtime_approvals、proxy_assignments、allowed_ips、public_holidays、notifications、email_logs
- 建立 Express + TypeScript backend 骨架，含 middleware 堆疊（auth、rbac、validate、errorHandler）與健康檢查端點
- 建立 React + Vite + TypeScript frontend 骨架，含 Layout shell、Router、TanStack Query、axios client（自動 refresh token）

## Capabilities

### New Capabilities

- `docker-infrastructure`: Docker Compose 服務編排與環境設定（postgres、pgAdmin、backend、frontend、MailHog）
- `database-schema`: PostgreSQL 資料庫 Schema 定義，涵蓋所有業務資料表、ENUM 型別、Index 與外鍵約束
- `backend-scaffold`: Express + TypeScript 專案骨架，含 middleware、路由框架、Knex 連線設定
- `frontend-scaffold`: React + Vite + TypeScript 專案骨架，含 Layout、Router、共用元件與 API client

### Modified Capabilities

（無現有規格，全部為新建）

## Impact

- **新增目錄**：`docker-compose.yml`、`db/`、`backend/`、`frontend/`
- **依賴項目**：Node.js 20、PostgreSQL 16、React 18、Vite、Tailwind CSS、shadcn/ui、Knex.js、Nodemailer
- **後續 Stream 依賴此 Stream**：所有後續功能開發（B~H）均以此為基礎
