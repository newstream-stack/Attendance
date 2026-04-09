# frontend-scaffold

## Purpose
定義 React 18 + TypeScript + Vite 前端專案的骨架結構，包含路由設定、Layout Shell、Auth 狀態管理、API 客戶端及共用元件庫等基礎設施。

## Requirements

### Requirement: React + Vite 專案骨架
系統 SHALL 建立 TypeScript + React 18 + Vite 專案，含 Tailwind CSS 與 shadcn/ui。

#### Scenario: Frontend 開發伺服器啟動
- **WHEN** 執行 `npm run dev`（或 docker compose 啟動 frontend 容器）
- **THEN** Vite dev server 在 port 3000 啟動，瀏覽器可存取首頁

#### Scenario: Tailwind CSS 生效
- **WHEN** 元件套用 Tailwind class（如 `className="bg-blue-500"`）
- **THEN** 樣式正確套用，無 class 找不到的警告

### Requirement: 路由結構（React Router v6）
系統 SHALL 建立路由設定，區分公開路由（無需登入）與受保護路由（需登入）。

#### Scenario: 未登入使用者存取受保護路由
- **WHEN** 未登入使用者直接存取 `/dashboard`
- **THEN** 自動導向 `/login`

#### Scenario: 已登入使用者存取登入頁
- **WHEN** 已登入使用者存取 `/login`
- **THEN** 自動導向 `/dashboard`

### Requirement: Layout Shell
系統 SHALL 提供 `PrivateLayout`（含 Sidebar + TopBar）與 `PublicLayout`（僅顯示內容）兩個 Layout 元件。

#### Scenario: PrivateLayout 結構正確
- **WHEN** 已登入使用者進入受保護路由
- **THEN** 頁面包含左側 Sidebar（含 Logo、導覽選單、登出按鈕）與上方 TopBar（含麵包屑、通知圖示、使用者頭像）

#### Scenario: Sidebar 導覽依角色顯示
- **WHEN** role=employee 的使用者登入
- **THEN** Sidebar 不顯示「管理者」相關選單項目（如使用者管理、報表）

### Requirement: Auth Context 與狀態管理
系統 SHALL 使用 Zustand 管理 auth state（currentUser、accessToken），提供 `useAuth` hook。

#### Scenario: Auth state 正確初始化
- **WHEN** 頁面重新載入
- **THEN** 系統嘗試用 refresh token（httpOnly cookie）換取新 access token；成功則保持登入，失敗則導向登入頁

#### Scenario: useAuth hook 提供正確資料
- **WHEN** 元件呼叫 `useAuth()`
- **THEN** 取得 `{ user, isLoading, login, logout }` 介面

### Requirement: Axios Client 與自動 Token 刷新
系統 SHALL 建立 axios instance，含 interceptor 自動在 401 時呼叫 `/auth/refresh` 刷新 token 後重試原始請求。

#### Scenario: Access token 過期後自動刷新並重試
- **WHEN** API 呼叫回傳 401（token 過期）且 refresh token 有效
- **THEN** axios interceptor 自動取得新 access token 並重試原始請求，呼叫端無感知

#### Scenario: Refresh token 失效時導向登入
- **WHEN** API 呼叫回傳 401 且 refresh token 亦無效
- **THEN** 清除 auth state 並導向 `/login`

### Requirement: TanStack Query 設定
系統 SHALL 設定 TanStack Query（QueryClient）作為所有 server state 的管理層，含全域 error handling。

#### Scenario: API 錯誤顯示 toast 通知
- **WHEN** TanStack Query mutation 或 query 回傳錯誤
- **THEN** 顯示 toast 錯誤通知（使用 shadcn/ui Toast），不讓頁面崩潰

### Requirement: 繁體中文介面
系統 SHALL 使用繁體中文作為所有 UI 文字，包含選單、按鈕、錯誤訊息、表單標籤。

#### Scenario: 介面文字為繁體中文
- **WHEN** 使用者瀏覽任何頁面
- **THEN** 所有 UI 元素（按鈕、標籤、提示訊息）均顯示繁體中文

### Requirement: RWD 響應式設計
系統 SHALL 支援行動裝置瀏覽器，關鍵操作（打卡、查看假期餘額）在手機螢幕上可操作。

#### Scenario: 手機裝置可正常使用
- **WHEN** 使用 375px 寬度的手機瀏覽器存取系統
- **THEN** Sidebar 收合為 hamburger menu，主要內容區域可正常捲動與操作，無水平捲軸

### Requirement: 共用元件庫
系統 SHALL 提供以下共用元件，供各 feature 使用。

#### Scenario: 共用元件存在且可使用
- **WHEN** 開發者在 feature 元件中 import 共用元件
- **THEN** 以下元件可正常 import 與渲染：`StatusBadge`（pending/approved/rejected 顏色）、`DataTable`（可分頁、可排序）、`ConfirmDialog`、`PageSkeleton`（loading 骨架）、`FormField`（React Hook Form 整合的欄位包裝）
