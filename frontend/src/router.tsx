import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import PrivateLayout from '@/components/layouts/PrivateLayout'
import PublicLayout from '@/components/layouts/PublicLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import ChangePasswordPage from '@/pages/ChangePasswordPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import AdminUsersPage from '@/pages/AdminUsersPage'
import AdminAllowedIpsPage from '@/pages/AdminAllowedIpsPage'
import AttendanceHistoryPage from '@/pages/AttendanceHistoryPage'
import LeaveApplyPage from '@/pages/LeaveApplyPage'
import LeaveHistoryPage from '@/pages/LeaveHistoryPage'
import LeaveBalancesPage from '@/pages/LeaveBalancesPage'
import LeaveApprovalsPage from '@/pages/LeaveApprovalsPage'
import AdminLeaveTypesPage from '@/pages/AdminLeaveTypesPage'
import OvertimeApplyPage from '@/pages/OvertimeApplyPage'
import OvertimeApprovalsPage from '@/pages/OvertimeApprovalsPage'
import ProxyPage from '@/pages/ProxyPage'
import AdminReportsPage from '@/pages/AdminReportsPage'
import AdminDepartmentsPage from '@/pages/AdminDepartmentsPage'

function PrivateRoute() {
  const { user, isLoading } = useAuthStore()
  const location = useLocation()

  if (isLoading) return <PageSkeleton />
  if (!user) return <Navigate to="/login" replace />

  // Force password change on first login
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  return <PrivateLayout />
}

function PublicRoute() {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return <PageSkeleton />
  if (user) return <Navigate to="/dashboard" replace />
  return (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <PrivateRoute />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/change-password', element: <ChangePasswordPage /> },
      { path: '/admin/users', element: <AdminUsersPage /> },
      { path: '/admin/allowed-ips', element: <AdminAllowedIpsPage /> },
      { path: '/attendance/history', element: <AttendanceHistoryPage /> },
      { path: '/leave/apply', element: <LeaveApplyPage /> },
      { path: '/leave/history', element: <LeaveHistoryPage /> },
      { path: '/leave/balances', element: <LeaveBalancesPage /> },
      { path: '/leave/approvals', element: <LeaveApprovalsPage /> },
      { path: '/admin/leave-types', element: <AdminLeaveTypesPage /> },
      { path: '/overtime/apply', element: <OvertimeApplyPage /> },
      { path: '/overtime/approvals', element: <OvertimeApprovalsPage /> },
      { path: '/proxy', element: <ProxyPage /> },
      { path: '/admin/reports', element: <AdminReportsPage /> },
      { path: '/admin/departments', element: <AdminDepartmentsPage /> },
    ],
  },
])
