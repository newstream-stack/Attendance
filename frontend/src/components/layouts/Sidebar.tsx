import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Clock, CalendarOff, Timer, Users,
  Settings, LogOut, UserCheck, BarChart3, X, Shield, Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  roles?: Array<'admin' | 'manager' | 'employee'>
}

const navItems: NavItem[] = [
  { label: '儀表板', to: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: '打卡記錄', to: '/attendance/history', icon: <Clock className="h-5 w-5" /> },
  { label: '請假申請', to: '/leave/apply', icon: <CalendarOff className="h-5 w-5" /> },
  { label: '我的假期', to: '/leave/history', icon: <CalendarOff className="h-5 w-5" /> },
  { label: '假期餘額', to: '/leave/balances', icon: <CalendarOff className="h-5 w-5" /> },
  { label: '加班申請', to: '/overtime/apply', icon: <Timer className="h-5 w-5" /> },
  { label: '代理人設定', to: '/proxy', icon: <UserCheck className="h-5 w-5" /> },
  { label: '待審核（請假）', to: '/leave/approvals', icon: <CalendarOff className="h-5 w-5" />, roles: ['admin', 'manager'] },
  { label: '待審核（加班）', to: '/overtime/approvals', icon: <Timer className="h-5 w-5" />, roles: ['admin', 'manager'] },
  { label: '員工管理', to: '/admin/users', icon: <Users className="h-5 w-5" />, roles: ['admin'] },
  { label: '部門管理', to: '/admin/departments', icon: <Building2 className="h-5 w-5" />, roles: ['admin'] },
  { label: '打卡 IP 管理', to: '/admin/allowed-ips', icon: <Shield className="h-5 w-5" />, roles: ['admin'] },
  { label: '假別設定', to: '/admin/leave-types', icon: <Settings className="h-5 w-5" />, roles: ['admin'] },
  { label: '報表', to: '/admin/reports', icon: <BarChart3 className="h-5 w-5" />, roles: ['admin', 'manager'] },
]

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { user, logout } = useAuth()

  const filtered = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  )

  return (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      {/* Logo + mobile close */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-slate-700">
        <span className="text-lg font-bold tracking-tight">出缺勤系統</span>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-slate-800 lg:hidden">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {filtered.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="border-t border-slate-700 px-4 py-4">
        <div className="mb-3 text-xs text-slate-400 truncate">{user?.fullName}</div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-slate-300 hover:bg-slate-800 hover:text-white"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          登出
        </Button>
      </div>
    </div>
  )
}
