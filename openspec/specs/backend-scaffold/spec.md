# backend-scaffold

## Purpose
定義 Node.js + Express + TypeScript 後端專案的骨架結構，包含中介層堆疊、資料庫連線、驗證機制及錯誤處理等基礎設施。

## Requirements

### Requirement: Express 應用程式骨架
系統 SHALL 建立 TypeScript + Express 專案，具備完整的目錄結構與中介層堆疊。

#### Scenario: Backend 服務啟動
- **WHEN** 執行 `npm run dev`（或 docker compose 啟動 backend 容器）
- **THEN** Express server 在 port 4000 監聽，console 輸出啟動成功訊息

#### Scenario: 健康檢查端點
- **WHEN** 發送 `GET /health`
- **THEN** 回傳 HTTP 200 與 `{ "status": "ok", "timestamp": "<ISO8601>" }`

### Requirement: 環境變數設定
系統 SHALL 透過 `dotenv` 載入環境變數，並在啟動時驗證必要變數存在，缺少時拋出明確錯誤。

#### Scenario: 缺少必要環境變數時啟動失敗
- **WHEN** `DATABASE_URL` 或 `JWT_SECRET` 未設定即啟動 backend
- **THEN** 程序輸出明確錯誤訊息並以非零 exit code 退出，不靜默失敗

### Requirement: PostgreSQL 連線（Knex.js）
系統 SHALL 使用 Knex.js 建立 PostgreSQL 連線池，並支援 migration 指令。

#### Scenario: DB 連線成功
- **WHEN** backend 啟動且 `DATABASE_URL` 正確
- **THEN** Knex 連線池建立成功，`knex raw('SELECT 1')` 可執行

#### Scenario: Migration 指令可執行
- **WHEN** 執行 `npm run migrate`
- **THEN** `knex migrate:latest` 執行成功，migration 版本記錄在 `knex_migrations` 資料表

### Requirement: JWT 驗證中介層
系統 SHALL 提供 `authMiddleware`，驗證 Bearer JWT access token，並將解碼後的 user 資訊附加至 `req.user`。

#### Scenario: 有效 token 可存取受保護路由
- **WHEN** 請求 Header 含有效的 `Authorization: Bearer <token>`
- **THEN** `req.user` 含 `{ id, email, role }`，請求繼續處理

#### Scenario: 無效或過期 token 被拒絕
- **WHEN** 請求帶有過期或偽造的 JWT
- **THEN** 回傳 HTTP 401 `{ "error": "Unauthorized" }`

### Requirement: RBAC 角色守衛中介層
系統 SHALL 提供 `requireRole(...roles)` 工廠函數，限制端點僅特定角色可存取。

#### Scenario: 角色不符時被拒絕
- **WHEN** `role=employee` 的使用者存取 `requireRole('admin')` 保護的端點
- **THEN** 回傳 HTTP 403 `{ "error": "Forbidden" }`

### Requirement: 請求驗證中介層（Zod）
系統 SHALL 提供 `validate(schema)` 中介層，使用 Zod schema 驗證 request body/query/params，驗證失敗回傳結構化錯誤。

#### Scenario: 請求驗證失敗
- **WHEN** 請求 body 不符合 Zod schema（如缺少必填欄位）
- **THEN** 回傳 HTTP 422 `{ "error": "Validation Error", "details": [...] }`

### Requirement: 統一錯誤處理中介層
系統 SHALL 提供 Express error handler，捕獲所有未處理錯誤，回傳一致的 JSON 格式，生產環境不洩漏 stack trace。

#### Scenario: 未捕獲錯誤統一回應
- **WHEN** route handler 拋出未處理的 Error
- **THEN** 回傳 HTTP 500 `{ "error": "Internal Server Error" }`，不含 stack trace（NODE_ENV=production）

### Requirement: CORS 設定
系統 SHALL 設定 CORS，允許 frontend origin（`http://localhost:3000`）存取 API，並支援 credentials（cookies）。

#### Scenario: CORS preflight 通過
- **WHEN** frontend 發送跨來源請求（含 credentials）
- **THEN** backend 回傳正確的 CORS headers，不回傳 CORS 錯誤

### Requirement: 目錄結構
系統 SHALL 使用以下目錄結構組織 backend 程式碼，關注點分離。

#### Scenario: 目錄結構符合規範
- **WHEN** 檢視 `backend/src/` 目錄
- **THEN** 存在以下子目錄：`config/`（DB/env 設定）、`middleware/`（auth/rbac/validate/errorHandler）、`routes/`（各模組路由）、`services/`（業務邏輯）、`repositories/`（SQL 查詢）、`types/`（共用 TS 型別）、`utils/`（工具函數）
