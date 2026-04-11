import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable, Column } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { useMyLeaveRequests, useCancelLeaveRequest, LeaveRequest } from '@/api/leave.api'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
}
function fmtMins(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function LeaveHistoryPage() {
  const { toast } = useToast()
  const { data: requests = [], isLoading } = useMyLeaveRequests()
  const cancelRequest = useCancelLeaveRequest()
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null)

  const handleCancel = async () => {
    if (!cancelTarget) return
    try {
      await cancelRequest.mutateAsync(cancelTarget.id)
      toast({ title: '已取消申請' })
    } catch {
      toast({ variant: 'destructive', title: '取消失敗' })
    } finally {
      setCancelTarget(null)
    }
  }

  const columns: Column<LeaveRequest>[] = [
    { key: 'leave_type_name', header: '假別', sortable: true },
    { key: 'start_time', header: '開始', render: (r) => fmtDate(r.start_time) },
    { key: 'end_time', header: '結束', render: (r) => fmtDate(r.end_time) },
    { key: 'duration_mins', header: '時數', render: (r) => fmtMins(r.duration_mins) },
    { key: 'half_day', header: '半天', render: (r) => r.half_day ? (r.half_day_period === 'am' ? '上午' : '下午') : '否' },
    { key: 'status', header: '狀態', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '',
      render: (r) => ['pending', 'approved'].includes(r.status) ? (
        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setCancelTarget(r)}>
          取消
        </Button>
      ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">我的請假紀錄</h1>
        <Button asChild>
          <Link to="/leave/apply"><Plus className="h-4 w-4 mr-1" />新增申請</Link>
        </Button>
      </div>

      <DataTable
        data={requests as unknown as Record<string, unknown>[]}
        columns={columns as Column<Record<string, unknown>>[]}
        emptyText={isLoading ? '載入中...' : '尚無請假紀錄'}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="取消請假"
        description={`確定要取消 ${cancelTarget?.leave_type_name ?? ''} 申請？`}
        confirmLabel="確定取消"
        onConfirm={handleCancel}
      />
    </div>
  )
}
