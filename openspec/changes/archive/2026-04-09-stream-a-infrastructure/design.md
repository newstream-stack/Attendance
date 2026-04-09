## Context

出缺勤管理系統從零開始建置，目前目錄中僅有 OpenSpec 框架設定檔，無任何應用程式碼。本設計涵蓋技術棧選型、專案目錄結構、Docker 服務編排、資料庫設計原則，以及 backend/frontend 骨架的技術決策。

**技術棧（已確認）：**
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Backend: Node.js 20 + Express + TypeScript + Knex.js
- Database: PostgreSQL 16
- 容器化: Docker Compose

## Goals / Non-Goals

**Goals:**
- 建立可一鍵啟動（`docker compose up`）的完整開發環境
- 定義所有業務資料表，讓後續 Stream 可直接使用
- 建立 Express backend 骨架，含中介層堆疊、型別安全的 DB 連線
- 建立 React frontend 骨架，含路由、Layout、Auth context 框架
- 提供 MailHog 攔截 dev 環境 email，避免誤寄真實信件

**Non-Goals:**
- 本 Stream 不實作任何業務邏輯（登入、打卡、請假等）
- 不建立 production 部署流程（CI/CD）
- 不設定 HTTPS / TLS（留給 prod 設定）

## Decisions

### D1：Query Builder（Knex.js）而非 ORM（Prisma / TypeORM）

**選擇 Knex.js**

PostgreSQL 特有功能（視窗函數、`SELECT ... FOR UPDATE` 行鎖、ENUM 型別）在 ORM 中難以直接使用。Knex 提供：
- migration 管理（`knex migrate:latest`）
- 安全的參數化查詢
- 完整 SQL 控制

替代方案考量：
- Prisma：自動產生型別但對複雜 SQL 支援有限，且 schema 與 DB migration 分離增加複雜度
- TypeORM：裝飾器語法過重，且已知 PostgreSQL 相容性問題

### D2：JWT 策略 — 短效 access token + httpOnly refresh cookie

- Access token：15 分鐘，存放在記憶體（React state / Zustand），**不放 localStorage**（防 XSS）
- Refresh token：7 天，存在 httpOnly Secure SameSite=Strict Cookie（防 XSS + CSRF）
- Axios interceptor 在 401 時自動呼叫 `/auth/refresh`

替代方案考量：長效 JWT 無法 revoke，不適合含個資的 HR 系統。

### D3：資料表時間欄位一律用 TIMESTAMPTZ（UTC）

所有 `clock_in`、`start_time`、`end_time` 等欄位儲存為 UTC TIMESTAMPTZ，前端負責轉換為 Asia/Taipei 顯示。避免日光節約時間或時區設定異動造成資料錯誤。

### D4：時間長度單位用分鐘（INTEGER）

`duration_mins`、`allocated_mins`、`used_mins` 等欄位以分鐘為單位儲存，前端再換算為小時或天數顯示。避免 0.5 天、4 小時等邊界問題的浮點數精度風險。

### D5：Email 非同步佇列（email_logs 資料表 + setInterval worker）

建立帳號、簽核通知等 email 不在 request handler 中同步發送（避免 timeout）。改為：
1. Request handler 插入 `email_logs`（status='pending'）
2. Backend 啟動時開啟 setInterval（每 30 秒），撈取 pending 並呼叫 Nodemailer 發送
3. 成功標記 'sent'，失敗標記 'failed' + 記錄錯誤訊息

Dev 環境 SMTP 指向 MailHog（port 1025），所有 email 可在 localhost:8025 查看。

### D6：Frontend 狀態管理 — Zustand（僅 auth state）+ TanStack Query（server state）

Server state（使用者資料、請假記錄等）全部由 TanStack Query 管理，不進 Zustand。Zustand 僅管理 auth state（currentUser、accessToken）。避免重複同步兩個 store 的狀態。

### D7：打卡 IP 白名單存資料庫（allowed_ips 資料表）

允許打卡的公司 IP 不寫死在 .env，改存在 `allowed_ips` 資料表，由管理者在後台維護（可新增/刪除多組 IP）。Backend 打卡端點取得 `req.ip` 後查詢此資料表驗證。

## Risks / Trade-offs

| 風險 | 緩解措施 |
|------|---------|
| Knex 缺少自動型別生成 | 手動維護 `backend/src/types/index.ts` 對應 DB schema，Stream B 起統一使用 |
| Docker 在 M1/M2 Mac 上可能需要 `platform: linux/amd64` | 在 docker-compose.yml 各服務加上 `platform` 欄位作為備用 |
| pgAdmin 首次啟動需手動新增 server 連線 | 在 `002_seed.sql` 附近提供 pgAdmin server 設定 JSON（pgadmin/servers.json），掛載進容器自動載入 |
| MailHog 不支援 STARTTLS，prod 環境須替換 SMTP 設定 | .env.example 說明 prod SMTP 環境變數（SMTP_HOST、SMTP_PORT、SMTP_USER、SMTP_PASS） |

## Migration Plan

1. 執行 `docker compose up --build` 啟動所有服務
2. postgres healthcheck 通過後，`docker-entrypoint-initdb.d/` 中的 SQL 自動執行（001_schema.sql → 002_seed.sql）
3. backend 啟動時執行 `knex migrate:latest`（Knex migrations 與 init SQL 共存，migration 管理後續 schema 異動）
4. 驗證：pgAdmin localhost:5050 確認所有資料表存在；`GET /health` 回傳 200

## Open Questions

- 國定假日（`public_holidays`）初始資料：Stream E（請假）實作前需要確認是否由管理者手動輸入，或從外部 API 匯入（暫定手動輸入）
- prod 環境 frontend 採用 nginx 反向代理還是獨立 CDN 部署（本 Stream 僅建立 dev 設定，prod 設定留給後續討論）
