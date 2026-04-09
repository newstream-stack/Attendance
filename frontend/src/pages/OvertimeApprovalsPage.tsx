import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable, Column } from '@/components/shared/DataTable'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { usePendingOvertimeApprovals, useApproveOvertimeRequest, useRejectOvertimeRequest, OvertimeRequest } from '@/api/overtime.api'

function fmtMins(mins: number) {
  return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`
}

export default function OvertimeApprovalsPage() {
  const { toast } = useToast()
  const { data: requests = [], isLoading } = usePendingOvertimeApprovals()
  const approve = useApproveOvertimeRequest()
  const reject = useRejectOvertimeRequest()

  const [actionTarget, setActionTarget] = useState<{ req: OvertimeRequest; type: 'approve' | 'reject' } | null>(null)
  const [comment, setComment] = useState('')

  const handleAction = async () => {
    if (!actionTarget) return
    try {
      if (actionTarget.type === 'approve') {
        await approve.mutateAsync({ id: actionTarget.req.id, comment })
        toast({
          title: '已核准',
          description: actionTarget.req.convert_to_comp ? '補休已自動入帳' : undefined,
        })
      } else {
        await reject.mutateAsync({ id: actionTarget.req.id, comment })
        toast({ title: '已退回' })
      }
    } catch {
      toast({ variant: 'destructive', title: '操作失敗' })
    } finally {
      setActionTarget(null)
      setComment('')
    }
  }

  const columns: Column<OvertimeRequest>[] = [
    { key: 'employee_id', header: '員工編號', sortable: true },
    { key: 'full_name', header: '姓名', sortable: true },
    { key: 'work_date', header: '加班日期', sortable: true },
    { key: 'duration_mins', header: '時數', render: (r) => fmtMins(r.duration_mins) },
    { key: 'convert_to_comp', header: '轉補休', render: (r) => r.convert_to_comp ? '是' : '否' },
    { key: 'status', header: '狀態', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { setActionTarget({ req: r, type: 'approve' }); setComment('') }}>核准</Button>
          <Button size="sm" variant="outline" className="text-red-500 border-red-200"
            onClick={() => { setActionTarget({ req: r, type: 'reject' }); setComment('') }}>退回</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">待審核加班</h1>

      <DataTable
        data={requests as unknown as Record<string, unknown>[]}
        columns={columns as Column<Record<string, unknown>>[]}
        emptyText={isLoading ? '載入中...' : '目前無待審核加班申請'}
      />

      <Dialog open={!!actionTarget} onOpenChange={(o) => !o && setActionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionTarget?.type === 'approve' ? '核准' : '退回'}加班申請</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {actionTarget && (
              <div className="text-sm text-slate-600 space-y-1">
                <p>{actionTarget.req.full_name} — {actionTarget.req.work_date}（{fmtMins(actionTarget.req.duration_mins)}）</p>
                {actionTarget.req.convert_to_comp && actionTarget.type === 'approve' && (
                  <p className="text-blue-600 font-medium">核准後將自動入帳補休 {fmtMins(actionTarget.req.duration_mins)}</p>
                )}
              </div>
            )}
            <div>
              <label className="text-sm font-medium">備註（選填）</label>
              <textarea
                className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm min-h-[70px] resize-none focus:outline-none focus:ring-1 focus:ring-ring"
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
