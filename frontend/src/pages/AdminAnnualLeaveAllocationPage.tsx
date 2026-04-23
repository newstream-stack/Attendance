import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable, Column } from '@/components/shared/DataTable'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  useAnnualLeavePreview,
  useAllocateAnnual,
  useAdjustLeaveBalance,
  useSetAnnualAllocated,
  AnnualLeavePreviewRow,
} from '@/api/leave.api'

function fmtMins(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function minsToDay(mins: number, hoursPerDay = 8) {
  return Math.round((mins / (hoursPerDay * 60)) * 10) / 10
}

export default function AdminAnnualLeaveAllocationPage() {
  const { toast } = useToast()
  const [year, setYear] = useState(new Date().getFullYear())
  const [queryYear, setQueryYear] = useState(year)

  const { data: rows = [], isLoading, refetch } = useAnnualLeavePreview(queryYear)
  const allocate = useAllocateAnnual()
  const adjust = useAdjustLeaveBalance()
  const setAllocated = useSetAnnualAllocated()

  const [adjustTarget, setAdjustTarget] = useState<AnnualLeavePreviewRow | null>(null)
  const [adjustMins, setAdjustMins] = useState('')

  const [allocateTarget, setAllocateTarget] = useState<AnnualLeavePreviewRow | null>(null)
  const [allocateHrs, setAllocateHrs] = useState('')

  const handleAllocate = async () => {
    try {
      const result = await allocate.mutateAsync(queryYear)
      toast({ title: `已配發 ${result.allocated} 位員工的年假（累加）` })
      refetch()
    } catch {
      toast({ variant: 'destructive', title: '配發失敗' })
    }
  }

  const handleSetAllocated = async () => {
    if (!allocateTarget) return
    const hrs = parseFloat(allocateHrs)
    if (isNaN(hrs) || hrs < 0) return
    try {
      await setAllocated.mutateAsync({ user_id: allocateTarget.user_id, year: queryYear, allocated_mins: Math.round(hrs * 60) })
      toast({ title: '已更新配發時數' })
      setAllocateTarget(null)
    } catch {
      toast({ variant: 'destructive', title: '更新失敗' })
    }
  }

  const handleAdjust = async () => {
    if (!adjustTarget?.balance_id) return
    const hrs = parseFloat(adjustMins)
    if (isNaN(hrs)) return
    try {
      await adjust.mutateAsync({ id: adjustTarget.balance_id, adjusted_mins: Math.round(hrs * 60) })
      toast({ title: '已更新調整額度' })
      setAdjustTarget(null)
    } catch {
      toast({ variant: 'destructive', title: '更新失敗' })
    }
  }

  const columns: Column<AnnualLeavePreviewRow>[] = [
    { key: 'full_name', header: '姓名', sortable: true },
    { key: 'department', header: '部門', render: (r) => r.department ?? '—' },
    { key: 'hire_date', header: '到職日', render: (r) => r.hire_date.slice(0, 10) },
    {
      key: 'statutory_days',
      header: '法定天數',
      render: (r) => r.statutory_days === 0
        ? <Badge variant="secondary">未達資格</Badge>
        : `${Number(r.statutory_days).toFixed(2)} 天（${(Number(r.statutory_days) * 8).toFixed(2)}h）`,
    },
    {
      key: 'allocated_mins',
      header: '已配發',
      render: (r) => r.statutory_days === 0 ? '—' : (
        <button
          className="text-left hover:underline hover:text-blue-600 cursor-pointer"
          onClick={() => { setAllocateTarget(r); setAllocateHrs(String(r.allocated_mins / 60)) }}
        >
          {r.allocated_mins === 0 ? '—' : `${minsToDay(r.allocated_mins)} 天（${fmtMins(r.allocated_mins)}）`}
        </button>
      ),
    },
    {
      key: 'remaining_mins',
      header: '剩餘',
      render: (r) => {
        if (r.balance_id === null) return '—'
        const color = r.remaining_mins < 0 ? 'text-red-500' : ''
        return <span className={color}>{fmtMins(r.remaining_mins)}</span>
      },
    },
    {
      key: 'adjusted_mins',
      header: '調整（小時）',
      render: (r) => {
        if (!r.balance_id) return '—'
        const hrs = r.adjusted_mins / 60
        return <span className={hrs < 0 ? 'text-red-500' : hrs > 0 ? 'text-green-600' : 'text-slate-400'}>
          {hrs > 0 ? `+${hrs}h` : hrs < 0 ? `${hrs}h` : '0'}
        </span>
      },
    },
    {
      key: 'actions', header: '',
      render: (r) => r.balance_id ? (
        <Button
          size="sm" variant="outline"
          onClick={() => {
            setAdjustTarget(r)
            setAdjustMins(String(r.adjusted_mins / 60))
          }}
        >
          調整
        </Button>
      ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">年假管理</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            className="w-24"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
          <Button variant="outline" onClick={() => setQueryYear(year)}>查詢</Button>
          <Button onClick={handleAllocate} disabled={allocate.isPending}>
            {allocate.isPending ? '配發中...' : `依勞基法配發 ${queryYear} 年假`}
          </Button>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        「依勞基法配發」將依各員工年資計算年假天數，<strong>累加</strong>至現有配發額度（不覆蓋）。
      </p>

      <DataTable
        data={rows as unknown as Record<string, unknown>[]}
        columns={columns as Column<Record<string, unknown>>[]}
        emptyText={isLoading ? '載入中...' : '查無資料，請先執行配發'}
        pageSize={20}
      />

      <Dialog open={!!allocateTarget} onOpenChange={(o) => !o && setAllocateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>手動設定配發時數 — {allocateTarget?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              直接設定此員工 {queryYear} 年的配發時數（小時）。此操作會覆蓋現有配發值。
            </p>
            <div>
              <label className="text-sm font-medium">配發小時數</label>
              <Input
                type="number"
                step="0.5"
                min="0"
                className="mt-1"
                placeholder="例：120（= 15天）"
                value={allocateHrs}
                onChange={(e) => setAllocateHrs(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocateTarget(null)}>取消</Button>
            <Button onClick={handleSetAllocated} disabled={setAllocated.isPending}>確認設定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adjustTarget} onOpenChange={(o) => !o && setAdjustTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>調整年假額度 — {adjustTarget?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              正數 = 增加時數，負數 = 扣除時數。此欄為調整值，不影響法定配發。
            </p>
            <div>
              <label className="text-sm font-medium">調整小時數</label>
              <Input
                type="number"
                step="0.5"
                className="mt-1"
                placeholder="例：2（= +2h）或 -1（= -1h）"
                value={adjustMins}
                onChange={(e) => setAdjustMins(e.target.value)}
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
