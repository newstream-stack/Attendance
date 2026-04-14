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
import MakeupPunchApplyPage from '@/pages/MakeupPunchApplyPage'
import MakeupPunchHistoryPage from '@/pages/MakeupPunchHistoryPage'
import AdminMakeupPunchReviewPage from '@/pages/AdminMakeupPunchReviewPage'
import AdminMakeupPunchRulesPage from '@/pages/AdminMakeupPunchRulesPage'
import AdminAnnualLeaveAllocationPage from '@/pages/AdminAnnualLeaveAllocationPage'
import AdminSystemSettingsPage from '@/pages/AdminSystemSettingsPage'
import AdminPublicHolidaysPage from '@/pages/AdminPublicHolidaysPage'
import OutingPage from '@/pages/OutingPage'
import AdminOutingsPage from '@/pages/AdminOutingsPage'
import HolidayCalendarPage from '@/pages/HolidayCalendarPage'
import ProxyReviewPage from '@/pages/ProxyReviewPage'
import AdminCompMorningDatesPage from '@/pages/AdminCompMorningDatesPage'

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
  if (user) return <Navigate to={user.role === 'admin' ? '/admin/reports' : '/dashboard'} replace />
  return (
    <PublicLayout>
      <Outlet />
    </PublicLayout>
  )
}

function RootRedirect() {
  const { user, isLoading } = useAuthStore()
  if (isLoading) return <PageSkeleton />
  return <Navigate to={user?.role === 'admin' ? '/admin/reports' : '/dashboard'} replace />
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
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
      { path: '/makeup-punch/apply', element: <MakeupPunchApplyPage /> },
      { path: '/makeup-punch/history', element: <MakeupPunchHistoryPage /> },
      { path: '/admin/makeup-punch/review', element: <AdminMakeupPunchReviewPage /> },
      { path: '/admin/makeup-punch/rules', element: <AdminMakeupPunchRulesPage /> },
      { path: '/admin/annual-leave', element: <AdminAnnualLeaveAllocationPage /> },
      { path: '/admin/system-settings', element: <AdminSystemSettingsPage /> },
      { path: '/admin/public-holidays', element: <AdminPublicHolidaysPage /> },
      { path: '/outing', element: <OutingPage /> },
      { path: '/admin/outings', element: <AdminOutingsPage /> },
      { path: '/holidays', element: <HolidayCalendarPage /> },
      { path: '/leave/proxy-review', element: <ProxyReviewPage /> },
      { path: '/admin/comp-morning-dates', element: <AdminCompMorningDatesPage /> },
    ],
  },
])
