import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable, Column } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { useMyMakeupPunchRequests, useCancelMakeupPunchRequest, MakeupPunchRequest } from '@/api/makeupPunch.api'

const PUNCH_TYPE_LABEL: Record<string, string> = {
  clock_in: '補上班打卡',
  clock_out: '補下班打卡',
}

function fmtTime(time: string) {
  return time.slice(0, 5)
}

export default function MakeupPunchHistoryPage() {
  const { toast } = useToast()
  const { data: requests = [], isLoading } = useMyMakeupPunchRequests()
  const cancel = useCancelMakeupPunchRequest()
  const [cancelTarget, setCancelTarget] = useState<MakeupPunchRequest | null>(null)

  const handleCancel = async () => {
    if (!cancelTarget) return
    try {
      await cancel.mutateAsync(cancelTarget.id)
      toast({ title: '已取消補打卡申請' })
    } catch {
      toast({ variant: 'destructive', title: '取消失敗' })
    } finally {
      setCancelTarget(null)
    }
  }

  const columns: Column<MakeupPunchRequest>[] = [
    { key: 'work_date', header: '補打日期', sortable: true, render: (r) => new Date(r.work_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }) },
    { key: 'punch_type', header: '類型', render: (r) => PUNCH_TYPE_LABEL[r.punch_type] ?? r.punch_type },
    { key: 'requested_time', header: '申請時間', render: (r) => fmtTime(r.requested_time) },
    { key: 'reason', header: '說明', render: (r) => r.reason ?? '—' },
    { key: 'status', header: '狀態', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'review_comment', header: '審核意見', render: (r) => r.review_comment ?? '—' },
    {
      key: 'actions', header: '',
      render: (r) => r.status === 'pending' ? (
        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setCancelTarget(r)}>
          取消
        </Button>
      ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">補打卡記錄</h1>
        <Button asChild>
          <Link to="/makeup-punch/apply"><Plus className="h-4 w-4 mr-1" />新增申請</Link>
        </Button>
      </div>

      <DataTable
        data={requests as unknown as Record<string, unknown>[]}
        columns={columns as Column<Record<string, unknown>>[]}
        emptyText={isLoading ? '載入中...' : '尚無補打卡記錄'}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="取消補打卡申請"
        description={`確定要取消 ${cancelTarget?.work_date ?? ''} ${PUNCH_TYPE_LABEL[cancelTarget?.punch_type ?? ''] ?? ''} 的申請？`}
        confirmLabel="確定取消"
        onConfirm={handleCancel}
      />
    </div>
  )
}
