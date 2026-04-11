import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable, Column } from '@/components/shared/DataTable'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  useAllMakeupPunchRequests,
  useApproveMakeupPunchRequest,
  useRejectMakeupPunchRequest,
  MakeupPunchRequest,
} from '@/api/makeupPunch.api'

const PUNCH_TYPE_LABEL: Record<string, string> = {
  clock_in: '補上班打卡',
  clock_out: '補下班打卡',
}

const STATUS_FILTER = ['all', 'pending', 'approved', 'rejected', 'cancelled'] as const
type StatusFilter = typeof STATUS_FILTER[number]

export default function AdminMakeupPunchReviewPage() {
  const { toast } = useToast()
  const { data: requests = [], isLoading } = useAllMakeupPunchRequests()
  const approve = useApproveMakeupPunchRequest()
  const reject = useRejectMakeupPunchRequest()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [actionTarget, setActionTarget] = useState<{ req: MakeupPunchRequest; type: 'approve' | 'reject' } | null>(null)
  const [comment, setComment] = useState('')

  const filtered = statusFilter === 'all' ? requests : requests.filter((r) => r.status === statusFilter)

  const handleAction = async () => {
    if (!actionTarget) return
    try {
      if (actionTarget.type === 'approve') {
        await approve.mutateAsync({ id: actionTarget.req.id, comment: comment || null })
        toast({ title: '已核准補打卡申請' })
      } else {
        await reject.mutateAsync({ id: actionTarget.req.id, comment: comment || null })
        toast({ title: '已退回補打卡申請' })
      }
    } catch {
      toast({ variant: 'destructive', title: '操作失敗' })
    } finally {
      setActionTarget(null)
      setComment('')
    }
  }

  const columns: Column<MakeupPunchRequest>[] = [
    { key: 'employee_id', header: '員工編號', sortable: true },
    { key: 'full_name', header: '姓名', sortable: true },
    {
      key: 'work_date', header: '補打日期', sortable: true,
      render: (r) => new Date(r.work_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }),
    },
    { key: 'punch_type', header: '類型', render: (r) => PUNCH_TYPE_LABEL[r.punch_type] ?? r.punch_type },
    { key: 'requested_time', header: '補打時間', render: (r) => r.requested_time.slice(0, 5) },
    { key: 'reason', header: '說明', render: (r) => r.reason ?? '—' },
    { key: 'status', header: '狀態', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'review_comment', header: '審核意見', render: (r) => r.review_comment ?? '—' },
    {
      key: 'actions', header: '',
      render: (r) => r.status === 'pending' ? (
        <div className="flex gap-2">
          <Button size="sm"
            onClick={() => { setActionTarget({ req: r, type: 'approve' }); setComment('') }}>
            核准
          </Button>
          <Button size="sm" variant="outline" className="text-red-500 border-red-200"
            onClick={() => { setActionTarget({ req: r, type: 'reject' }); setComment('') }}>
            退回
          </Button>
        </div>
      ) : null,
    },
  ]

  const STATUS_LABEL: Record<StatusFilter, string> = {
    all: '全部', pending: '待審核', approved: '已核准', rejected: '已退回', cancelled: '已取消',
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">補打卡審核</h1>

      {/* Status filter tabs */}
      <div className="flex border-b">
        {STATUS_FILTER.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${statusFilter === s ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {STATUS_LABEL[s]}
            {s === 'pending' && requests.filter((r) => r.status === 'pending').length > 0 && (
              <span className="ml-1.5 rounded-full bg-red-100 text-red-700 text-xs px-1.5 py-0.5">
                {requests.filter((r) => r.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      <DataTable
        data={filtered as unknown as Record<string, unknown>[]}
        columns={columns as Column<Record<string, unknown>>[]}
        emptyText={isLoading ? '載入中...' : '無資料'}
        pageSize={20}
      />

      <Dialog open={!!actionTarget} onOpenChange={(o) => !o && setActionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionTarget?.type === 'approve' ? '核准' : '退回'}補打卡申請
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {actionTarget && (
              <p className="text-sm text-slate-600">
                {actionTarget.req.full_name}（{actionTarget.req.employee_id}）—{' '}
                {new Date(actionTarget.req.work_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })}{' '}
                {PUNCH_TYPE_LABEL[actionTarget.req.punch_type]}{' '}
                {actionTarget.req.requested_time.slice(0, 5)}
              </p>
            )}
            <div>
              <label className="text-sm font-medium">審核意見（選填）</label>
              <Textarea
                className="mt-1"
                placeholder="可輸入審核意見..."
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionTarget(null)}>取消</Button>
            <Button
              variant={actionTarget?.type === 'reject' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={approve.isPending || reject.isPending}
            >
              確認{actionTarget?.type === 'approve' ? '核准' : '退回'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
