## 1. 專案目錄與 Docker 環境（A1）

- [x] 1.1 建立根目錄結構：`db/init/`、`backend/`、`frontend/`、`pgadmin/`
- [x] 1.2 建立 `.env.example`，列出所有必要環境變數（POSTGRES_DB、POSTGRES_USER、POSTGRES_PASSWORD、JWT_SECRET、PGADMIN_EMAIL、PGADMIN_PASSWORD、SMTP_HOST、SMTP_PORT）
- [x] 1.3 建立 `docker-compose.yml`，含 postgres（healthcheck）、pgAdmin、backend、frontend、mailhog 五個服務，設定 named volumes 與服務依賴
- [x] 1.4 建立 `pgadmin/servers.json`，設定自動連線 postgres 的 server 設定，掛載至 pgAdmin 容器
- [x] 1.5 建立 `backend/Dockerfile`（multi-stage: development target 含 nodemon hot-reload）
- [x] 1.6 建立 `frontend/Dockerfile`（development target 使用 Vite dev server）
- [x] 1.7 驗證：`docker compose up --build` 所有服務啟動健康，pgAdmin localhost:5050 可登入且有自動連線

## 2. PostgreSQL Schema（A2）

- [x] 2.1 建立 `db/init/001_schema.sql`，定義所有 ENUM 型別：`user_role`、`attendance_status`、`leave_request_status`、`overtime_request_status`、`approval_action`、`half_day_period`、`proxy_scope`、`email_status`
- [x] 2.2 在 `001_schema.sql` 建立 `users` 資料表（含 UUID PK、employee_id unique、role ENUM、manager_id FK self-reference）
- [x] 2.3 在 `001_schema.sql` 建立 `allowed_ips`、`attendance_records` 資料表
- [x] 2.4 在 `001_schema.sql` 建立 `leave_types`、`leave_balances`（含 UNIQUE constraint）資料表
- [x] 2.5 在 `001_schema.sql` 建立 `leave_requests`（含 work_proxy_user_id）、`leave_approvals` 資料表
- [x] 2.6 在 `001_schema.sql` 建立 `overtime_requests`、`overtime_approvals` 資料表
- [x] 2.7 在 `001_schema.sql` 建立 `proxy_assignments`、`public_holidays`、`notifications`、`email_logs` 資料表
- [x] 2.8 在 `001_schema.sql` 建立所有必要 Index（attendance_records、leave_requests、notifications、email_logs）
- [x] 2.9 建立 `db/init/002_seed.sql`：插入 6 種預設假別（年假/補休/病假/事假/喪假/其他）與初始 admin 帳號（密碼 bcrypt hash）
- [x] 2.10 驗證：重新執行 `docker compose down -v && docker compose up`，pgAdmin 中所有資料表與 seed 資料存在

## 3. Express Backend 骨架（A3）

- [x] 3.1 初始化 `backend/` 專案：`npm init`、安裝依賴（express、knex、pg、jsonwebtoken、bcryptjs、nodemailer、zod、dotenv、cors、helmet）、安裝 dev 依賴（typescript、@types/*、ts-node-dev、eslint）
- [x] 3.2 建立 `backend/tsconfig.json`、`backend/.eslintrc.js`、`backend/package.json` scripts（dev、build、migrate）
- [x] 3.3 建立 `backend/src/config/env.ts`：載入並驗證必要環境變數，缺少時 throw 明確錯誤
- [x] 3.4 建立 `backend/src/config/database.ts`：Knex 連線池設定，export `db` 實例
- [x] 3.5 建立 `backend/src/middleware/auth.ts`：JWT Bearer token 驗證，解碼後附加 `req.user`，無效回 401
- [x] 3.6 建立 `backend/src/middleware/rbac.ts`：`requireRole(...roles)` 工廠函數，角色不符回 403
- [x] 3.7 建立 `backend/src/middleware/validate.ts`：`validate(schema)` Zod 驗證中介層，驗證失敗回 422 含 details
- [x] 3.8 建立 `backend/src/middleware/errorHandler.ts`：全域 Express error handler，生產環境不露出 stack trace
- [x] 3.9 建立 `backend/src/types/index.ts`：定義共用 TypeScript 型別（User、AttendanceRecord、LeaveRequest 等對應 DB schema）
- [x] 3.10 建立 `backend/src/utils/jwt.ts`：`signAccessToken`、`signRefreshToken`、`verifyToken` 工具函數
- [x] 3.11 建立 `backend/src/app.ts`：組裝 Express app（helmet、cors、json parser、routes、errorHandler）
- [x] 3.12 建立 `backend/src/server.ts`：啟動 HTTP server，掛載 `GET /health` 端點
- [x] 3.13 建立 `backend/migrations/` 目錄與初始 migration 檔（後續 schema 異動用）
- [x] 3.14 驗證：`docker compose up` 後 `GET http://localhost:4000/health` 回傳 `{ "status": "ok" }`

## 4. React Frontend 骨架（A4）

- [x] 4.1 使用 `npm create vite@latest frontend -- --template react-ts` 初始化專案
- [x] 4.2 安裝依賴：`react-router-dom`、`@tanstack/react-query`、`axios`、`zustand`、`react-hook-form`、`@hookform/resolvers`、`zod`、`tailwindcss`、`postcss`、`autoprefixer`
- [x] 4.3 初始化 Tailwind CSS（`tailwind.config.ts`、`postcss.config.js`、在 `index.css` 引入 Tailwind 指令）
- [x] 4.4 安裝並初始化 shadcn/ui（`npx shadcn-ui@latest init`），加入元件：Button、Input、Card、Table、Dialog、Toast、Badge、Select、Skeleton
- [x] 4.5 建立 `frontend/src/api/client.ts`：axios instance（baseURL=VITE_API_BASE_URL），設定 request interceptor（附加 access token）與 response interceptor（401 時呼叫 `/auth/refresh` 刷新後重試，失敗則導向 `/login`）
- [x] 4.6 建立 `frontend/src/store/authStore.ts`：Zustand store，含 `user`、`accessToken`、`setAuth`、`clearAuth` actions
- [x] 4.7 建立 `frontend/src/hooks/useAuth.ts`：包裝 authStore，提供 `{ user, isLoading, login, logout }` 介面
- [x] 4.8 建立 `frontend/src/router.tsx`：React Router v6 設定，定義 PublicRoute（已登入導向 /dashboard）與 PrivateRoute（未登入導向 /login）
- [x] 4.9 建立 `frontend/src/components/layouts/PrivateLayout.tsx`：Sidebar + TopBar 骨架（含 hamburger menu for mobile RWD）
- [x] 4.10 建立 `frontend/src/components/layouts/PublicLayout.tsx`：置中卡片 layout（用於登入頁）
- [x] 4.11 建立 `frontend/src/components/layouts/Sidebar.tsx`：依 role 過濾的導覽選單，含 Logo、NavItems、登出按鈕
- [x] 4.12 建立 `frontend/src/components/layouts/TopBar.tsx`：麵包屑 + 通知圖示（badge placeholder）+ 使用者頭像 dropdown
- [x] 4.13 建立共用元件：`StatusBadge.tsx`（pending=yellow/approved=green/rejected=red）、`DataTable.tsx`（分頁 + 排序）、`ConfirmDialog.tsx`、`PageSkeleton.tsx`、`FormField.tsx`（React Hook Form 整合）
- [x] 4.14 建立 `frontend/src/App.tsx`：掛載 QueryClientProvider、RouterProvider、Toaster
- [x] 4.15 建立佔位頁面：`/dashboard`（"Dashboard"）、`/login`（基本登入表單 placeholder）
- [x] 4.16 驗證：`docker compose up` 後開啟 localhost:3000，顯示登入頁，未登入存取 `/dashboard` 自動導向 `/login`
