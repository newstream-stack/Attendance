import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLeaveBalances, LeaveBalance } from '@/api/leave.api'

function fmtMins(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function BalanceBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  return (
    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
      <div
        className={`h-1.5 rounded-full transition-all ${pct > 80 ? 'bg-red-400' : 'bg-primary'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default function LeaveBalancesPage() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { data: balances = [], isLoading } = useLeaveBalances(year)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">假期餘額</h1>
        <select
          className="rounded-md border border-input px-3 py-1.5 text-sm"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {[0, 1, -1].map((offset) => {
            const y = new Date().getFullYear() + offset
            return <option key={y} value={y}>{y} 年</option>
          })}
        </select>
      </div>

      {isLoading && <p className="text-slate-400">載入中...</p>}

      {!isLoading && balances.length === 0 && (
        <p className="text-slate-400 text-sm">本年度尚未配發假別額度</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {balances.map((b: LeaveBalance) => {
          const total = b.allocated_mins + b.carried_mins + b.adjusted_mins
          const remaining = total - b.used_mins
          return (
            <Card key={b.id}>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-slate-500">
                  {b.leave_type?.name_zh ?? '—'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmtMins(remaining)}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  已用 {fmtMins(b.used_mins)} / 總計 {fmtMins(total)}
                </p>
                <BalanceBar used={b.used_mins} total={total} />
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
