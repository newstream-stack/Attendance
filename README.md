# 出缺勤管理系統

員工打卡、請假、加班申請與簽核流程管理系統。

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js 20 + Express + TypeScript + Knex.js
- **Database**: PostgreSQL 16
- **容器**: Docker Compose（開發模式僅 DB + pgAdmin）

---

## 前置需求

| 工具 | 版本 | 說明 |
|------|------|------|
| Node.js | 20+ | 本地執行前後端 |
| npm | 10+ | 套件管理 |
| Docker Desktop | 最新版（**Apple Silicon 請下載 ARM64 版**） | 執行 DB |

> **⚠️ Apple Silicon（M1/M2/M3）用戶**：請下載 Apple Silicon 版 Docker Desktop，Intel 版無法在 M 系列 Mac 上執行。
> 下載連結：https://desktop.docker.com/mac/main/arm64/Docker.dmg

---

## 快速開始（本地開發）

### 1. 複製環境變數

```bash
cp .env.example .env
```

> `.env` 已包含開發用預設值，**無需修改**即可啟動。

### 2. 啟動資料庫（Docker）

```bash
docker compose -f docker-compose.local.yml up -d
```

啟動後：
- **PostgreSQL**: `localhost:5432`（自動執行 schema + seed）
- **pgAdmin**: http://localhost:5050
  - 帳號：`admin@company.com`
  - 密碼：`change_me_in_production`

### 3. 安裝依賴

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 4. 啟動後端

```bash
cd backend
npm run dev
```

API 服務啟動於 http://localhost:4000  
健康檢查：http://localhost:4000/health

### 5. 啟動前端

開新終端機：

```bash
cd frontend
npm run dev
```

前端服務啟動於 http://localhost:3000

---

## 預設帳號

| 角色 | Email | 密碼 |
|------|-------|------|
| 管理員 | `admin@company.com` | `Admin1234!` |

> ⚠️ 首次登入後系統會要求修改密碼。

---

## 服務對照表

| 服務 | 本地開發 URL | 說明 |
|------|-------------|------|
| 前端 | http://localhost:3000 | React Vite dev server |
| 後端 API | http://localhost:4000 | Express API |
| 健康檢查 | http://localhost:4000/health | 確認 API + DB 連線 |
| pgAdmin | http://localhost:5050 | DB 管理介面 |

---

## 常用指令

```bash
# 停止 DB 容器（保留資料）
docker compose -f docker-compose.local.yml down

# 停止並清除所有資料（重置 DB）
docker compose -f docker-compose.local.yml down -v

# 重新啟動 DB
docker compose -f docker-compose.local.yml up -d

# 查看 DB 容器 log
docker compose -f docker-compose.local.yml logs -f postgres
```

---

## 專案結構

```
Attendance/
├── docker-compose.local.yml   # 本地開發（僅 DB + pgAdmin）
├── docker-compose.yml         # 完整 Docker 環境（含前後端）
├── .env.example               # 環境變數範本
├── db/
│   └── init/
│       ├── 001_schema.sql     # 資料庫 schema
│       └── 002_seed.sql       # 初始資料
├── backend/                   # Express + TypeScript API
│   └── src/
│       ├── config/            # 環境變數、DB 連線
│       ├── middleware/        # auth、rbac、validate、errorHandler
│       ├── routes/            # API 路由
│       ├── services/          # 業務邏輯
│       ├── repositories/      # SQL 查詢層
│       ├── types/             # TypeScript 型別
│       └── utils/             # jwt、workingDays 等工具
└── frontend/                  # React + Vite
    └── src/
        ├── api/               # axios client
        ├── components/        # UI 元件
        ├── features/          # 功能模組
        ├── hooks/             # Custom hooks
        ├── pages/             # 頁面元件
        └── store/             # Zustand state
```
