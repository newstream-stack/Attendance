import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, Column } from '@/components/shared/DataTable'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useCompBalances, useAdjustCompBalance, CompBalanceRow } from '@/api/leave.api'

function fmtMins(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function AdminCompLeaveBalancePage() {
  const { toast } = useToast()
  const [year, setYear] = useState(new Date().getFullYear())
  const [queryYear, setQueryYear] = useState(year)

  const { data: rows = [], isLoading, refetch } = useCompBalances(queryYear)
  const adjust = useAdjustCompBalance()

  const [adjustTarget, setAdjustTarget] = useState<CompBalanceRow | null>(null)
  const [adjustHrs, setAdjustHrs] = useState('')

  const handleAdjust = async () => {
    if (!adjustTarget) return
    const hrs = parseFloat(adjustHrs)
    if (isNaN(hrs)) return
    try {
      await adjust.mutateAsync({
        user_id: adjustTarget.user_id,
        year: queryYear,
        adjusted_mins: Math.round(hrs * 60),
      })
      toast({ title: '已更新補休調整額度' })
      setAdjustTarget(null)
      refetch()
    } catch {
      toast({ variant: 'destructive', title: '更新失敗' })
    }
  }

  const columns: Column<CompBalanceRow>[] = [
    { key: 'full_name', header: '姓名', sortable: true },
    { key: 'department', header: '部門', render: (r) => r.department ?? '—' },
    {
      key: 'allocated_mins',
      header: '加班換補休',
      render: (r) => r.allocated_mins === 0 ? '—' : fmtMins(r.allocated_mins),
    },
    {
      key: 'adjusted_mins',
      header: '管理員調整',
      render: (r) => {
        const hrs = r.adjusted_mins / 60
        return (
          <span className={hrs < 0 ? 'text-red-500' : hrs > 0 ? 'text-green-600' : 'text-slate-400'}>
            {hrs > 0 ? `+${hrs}h` : hrs < 0 ? `${hrs}h` : '0'}
          </span>
        )
      },
    },
    {
      key: 'used_mins',
      header: '已使用',
      render: (r) => r.used_mins === 0 ? '—' : fmtMins(r.used_mins),
    },
    {
      key: 'remaining_mins',
      header: '剩餘',
      render: (r) => {
        const color = r.remaining_mins < 0 ? 'text-red-500' : ''
        return <span className={color}>{fmtMins(r.remaining_mins)}</span>
      },
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setAdjustTarget(r)
            setAdjustHrs(String(r.adjusted_mins / 60))
          }}
        >
          調整
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">補休管理</h1>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            className="w-24"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
          <Button variant="outline" onClick={() => setQueryYear(year)}>查詢</Button>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        「加班換補休」為加班審核時自動轉入的時數；「管理員調整」可手動增減（正數增加，負數扣除）。
      </p>

      <DataTable
        data={rows as unknown as Record<string, unknown>[]}
        columns={columns as Column<Record<string, unknown>>[]}
        emptyText={isLoading ? '載入中...' : '查無資料'}
        pageSize={20}
      />

      <Dialog open={!!adjustTarget} onOpenChange={(o) => !o && setAdjustTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>調整補休時數 — {adjustTarget?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              正數 = 增加時數，負數 = 扣除時數。此欄為調整值，不影響加班換補休的額度。
            </p>
            <div>
              <label className="text-sm font-medium">調整小時數</label>
              <Input
                type="number"
                step="0.5"
                className="mt-1"
                placeholder="例：2（= +2h）或 -1（= -1h）"
                value={adjustHrs}
                onChange={(e) => setAdjustHrs(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustTarget(null)}>取消</Button>
            <Button onClick={handleAdjust} disabled={adjust.isPending}>確認調整</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
