import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClockInCard } from '@/components/shared/ClockInCard'
import { useLeaveBalances, usePendingApprovals } from '@/api/leave.api'
import { usePendingOvertimeApprovals } from '@/api/overtime.api'

function fmtMins(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function BalanceBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  return (
    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
      <div
        className={`h-1.5 rounded-full transition-all ${pct > 80 ? 'bg-red-400' : 'bg-primary'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: balances = [] } = useLeaveBalances(new Date().getFullYear())
  const { data: pending = [] } = usePendingApprovals()
  const { data: pendingOT = [] } = usePendingOvertimeApprovals()

  const leaveCards = balances
    .filter((b) => b.leave_type)
    .map((b) => {
      const total = b.allocated_mins + b.carried_mins + b.adjusted_mins
      const remaining = total - b.used_mins
      return { ...b, total, remaining }
    })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">儀表板</h1>
        <p className="text-sm text-slate-500 mt-1">歡迎回來，{user?.fullName}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ClockInCard />

        {/* Leave balance cards */}
        {leaveCards.length > 0 ? leaveCards.map((b) => (
          <Link key={b.id} to="/leave/balances" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-slate-500">
                  {b.leave_type?.name_zh}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">{fmtMins(b.remaining)}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  已用 {fmtMins(b.used_mins)} / 總計 {fmtMins(b.total)}
                </p>
                <BalanceBar used={b.used_mins} total={b.total} />
              </CardContent>
            </Card>
          </Link>
        )) : (
          <Link to="/leave/balances" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">假期餘額</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">—</p>
                <p className="text-xs text-slate-400 mt-1">尚未配發假別額度</p>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Pending approvals (admin/manager only) */}
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
