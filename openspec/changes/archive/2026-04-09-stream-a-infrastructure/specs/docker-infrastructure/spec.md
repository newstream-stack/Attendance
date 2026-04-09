## ADDED Requirements

### Requirement: Docker Compose 環境啟動
系統 SHALL 提供 `docker-compose.yml`，執行 `docker compose up` 後能啟動所有必要服務，無需手動安裝任何依賴項目。

#### Scenario: 所有服務正常啟動
- **WHEN** 執行 `docker compose up` 且 `.env` 檔案存在
- **THEN** postgres、pgAdmin、backend、frontend、mailhog 五個服務均進入 healthy/running 狀態

#### Scenario: Postgres 健康檢查
- **WHEN** postgres 容器啟動後
- **THEN** healthcheck 每 10 秒執行 `pg_isready`，backend 等待 postgres healthy 後才啟動

### Requirement: 服務 Port 對應
系統 SHALL 將各服務 port 固定對應至 host，方便開發時直接存取。

#### Scenario: 各服務 port 可存取
- **WHEN** docker compose 啟動完成
- **THEN** postgres 可在 localhost:5432 存取、pgAdmin 在 localhost:5050、backend 在 localhost:4000、frontend 在 localhost:3000、mailhog web UI 在 localhost:8025

### Requirement: pgAdmin 自動連線設定
系統 SHALL 在 pgAdmin 啟動時自動載入 postgres 連線設定，無需使用者手動新增 server。

#### Scenario: pgAdmin 首次開啟即有連線
- **WHEN** 開啟 localhost:5050 並以 .env 中的帳密登入
- **THEN** 左側樹狀圖中已存在 "Attendance DB" server，可直接展開查看資料表

### Requirement: 環境變數範本
系統 SHALL 提供 `.env.example` 列出所有必要環境變數及其說明，不含實際機密值。

#### Scenario: 開發者複製環境變數範本
- **WHEN** 開發者執行 `cp .env.example .env` 並填入對應值
- **THEN** `docker compose up` 可成功啟動，無缺少環境變數錯誤

### Requirement: MailHog 攔截開發 Email
系統 SHALL 在 dev 環境中將所有 SMTP 流量導向 MailHog，防止寄出真實 email。

#### Scenario: 寄送 email 可在 MailHog 查看
- **WHEN** backend 呼叫 Nodemailer 寄送 email（SMTP 指向 mailhog:1025）
- **THEN** 信件出現在 localhost:8025 的 MailHog Web UI，不寄至真實收件者

### Requirement: 資料持久化
系統 SHALL 使用 named volume 儲存 postgres 和 pgAdmin 資料，重啟容器後資料不遺失。

#### Scenario: 容器重啟後資料保留
- **WHEN** 執行 `docker compose down` 再 `docker compose up`（未加 `-v`）
- **THEN** postgres 中的資料和 pgAdmin 設定均完整保留
