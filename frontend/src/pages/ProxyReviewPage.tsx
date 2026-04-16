import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable, Column } from '@/components/shared/DataTable'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  usePendingProxyRequests, useProxyApprove, useProxyReject, LeaveRequest,
} from '@/api/leave.api'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
}
function fmtMins(mins: number) {
  return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`
}

export default function ProxyReviewPage() {
  const { toast } = useToast()
  const { data: requests = [], isLoading } = usePendingProxyRequests()
  const approve = useProxyApprove()
  const reject = useProxyReject()

  const [actionTarget, setActionTarget] = useState<{ req: LeaveRequest; type: 'approve' | 'reject' } | null>(null)
  const [comment, setComment] = useState('')

  const handleAction = async () => {
    if (!actionTarget) return
    try {
      if (actionTarget.type === 'approve') {
        await approve.mutateAsync({ id: actionTarget.req.id, comment })
        toast({ title: '已同意代理，請假申請將進入主管審核' })
      } else {
        await reject.mutateAsync({ id: actionTarget.req.id, comment })
        toast({ title: '已拒絕代理，申請人將收到通知' })
      }
    } catch {
      toast({ variant: 'destructive', title: '操作失敗' })
    } finally {
      setActionTarget(null)
      setComment('')
    }
  }

  const columns: Column<LeaveRequest>[] = [
    { key: 'applicant_name', header: '申請人', sortable: true },
    { key: 'leave_type_name', header: '假別' },
    { key: 'start_time', header: '開始', render: (r) => fmtDate(r.start_time) },
    { key: 'end_time', header: '結束', render: (r) => fmtDate(r.end_time) },
    { key: 'duration_mins', header: '時數', render: (r) => fmtMins(r.duration_mins) },
    { key: 'reason', header: '原因', render: (r) => r.reason ?? '—' },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" variant="default"
            onClick={() => { setActionTarget({ req: r, type: 'approve' }); setComment('') }}>
            同意代理
          </Button>
          <Button size="sm" variant="outline" className="text-red-500 border-red-200"
            onClick={() => { setActionTarget({ req: r, type: 'reject' }); setComment('') }}>
            拒絕
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">代理人確認</h1>
      <p className="text-sm text-slate-500">以下請假申請指定您為代理人，請確認是否同意代理。若拒絕，請假申請將不會生效。</p>

      <DataTable
        data={requests as unknown as Record<string, unknown>[]}
        columns={columns as Column<Record<string, unknown>>[]}
        emptyText={isLoading ? '載入中...' : '目前無待確認的代理申請'}
      />

      <Dialog open={!!actionTarget} onOpenChange={(o) => !o && setActionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionTarget?.type === 'approve' ? '同意代理' : '拒絕代理'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {actionTarget && (
              <p className="text-sm text-slate-600">
                {actionTarget.req.applicant_name} — {actionTarget.req.leave_type_name}（{fmtMins(actionTarget.req.duration_mins)}）
                <br />
                {fmtDate(actionTarget.req.start_time)} ～ {fmtDate(actionTarget.req.end_time)}
              </p>
            )}
            <div>
              <label className="text-sm font-medium">備註（選填）</label>
              <textarea
                className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="可輸入說明..."
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
              確認{actionTarget?.type === 'approve' ? '同意' : '拒絕'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
