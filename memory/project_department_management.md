---
name: 部門管理功能
description: 部門管理功能（CRUD）實作完成，含 migration、後端 API、前端頁面
type: project
---

部門管理功能已完整實作並驗證正常運作。

**Why:** 系統原本 users.department 為自由輸入字串，缺乏統一管理的部門清單。

**How to apply:** 新增部門相關需求時，以此功能為基礎延伸。

## 實作內容

### 後端
- `backend/migrations/20240102000000_create_departments.ts` — 建立 departments 資料表
- `backend/src/repositories/department.repository.ts`
- `backend/src/services/department.service.ts`
- `backend/src/routes/department.routes.ts`
- `backend/src/app.ts` — 註冊 `/api/v1/departments`

### 前端
- `frontend/src/api/departments.api.ts`
- `frontend/src/pages/AdminDepartmentsPage.tsx`
- `frontend/src/components/ui/textarea.tsx` — 新增缺少的元件
- `frontend/src/router.tsx` — 加入 `/admin/departments`
- `frontend/src/components/layouts/Sidebar.tsx` — 加入「部門管理」連結（admin only）
- `frontend/src/pages/AdminUsersPage.tsx` — 部門欄位改為下拉選單

## 設計決策
- departments 為獨立資料表；users.department 仍存部門名稱字串（非 FK），保持向後相容
- GET /departments 所有已登入使用者可讀（供下拉選單使用）
- 部門支援啟用/停用，停用後不出現在員工表單選單中
