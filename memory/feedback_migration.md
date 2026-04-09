---
name: Knex Migration 執行方式
description: 執行 knex migration 的正確路徑設定與指令
type: feedback
---

knexfile.ts 位於 `backend/src/config/`，migrations 目錄位於 `backend/migrations/`，相對路徑須設為 `../../migrations`（原本設定 `../migrations` 是錯的）。

**Why:** knex 執行時 working directory 會切換到 knexfile 所在目錄，導致相對路徑計算從 `src/config/` 出發。

**How to apply:** 每次新增 migration 確認 knexfile 路徑正確。執行 migration 指令需明確帶入 DATABASE_URL：

```bash
cd backend && DATABASE_URL=postgres://attendance_user:change_me_in_production@localhost:5432/attendance npx knex --knexfile src/config/knexfile.ts migrate:latest
```
