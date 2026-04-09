import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClockInCard } from '@/components/shared/ClockInCard'
import { useLeaveBalances, usePendingApprovals } from '@/api/leave.api'
import { usePendingOvertimeApprovals } from '@/api/overtime.api'

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: balances = [] } = useLeaveBalances()
  const { data: pending = [] } = usePendingApprovals()
  const { data: pendingOT = [] } = usePendingOvertimeApprovals()

  const annualBalance = balances.find((b) => b.leave_type?.code === 'annual')
  const annualRemaining = annualBalance
    ? annualBalance.allocated_mins + annualBalance.carried_mins + annualBalance.adjusted_mins - annualBalance.used_mins
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">儀表板</h1>
        <p className="text-sm text-slate-500 mt-1">歡迎回來，{user?.fullName}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ClockInCard />

        <Link to="/leave/balances" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">剩餘年假</CardTitle>
            </CardHeader>
            <CardContent>
              {annualRemaining !== null ? (
                <>
                  <p className="text-2xl font-bold text-slate-900">
                    {Math.floor(annualRemaining / 60)}h {annualRemaining % 60 > 0 ? `${annualRemaining % 60}m` : ''}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">點此查看全部假期餘額</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-slate-900">—</p>
                  <p className="text-xs text-slate-400 mt-1">尚未配發年假額度</p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        {(user?.role === 'admin' || user?.role === 'manager') && (
          <Link to="/leave/approvals" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">待審核（請假 / 加班）</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">{pending.length + pendingOT.length}</p>
                <p className="text-xs text-slate-400 mt-1">請假 {pending.length} 件・加班 {pendingOT.length} 件</p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </div>
  )
}
