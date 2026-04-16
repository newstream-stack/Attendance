import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Upload, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable, Column } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { useMyLeaveRequests, useCancelLeaveRequest, useUploadLeaveAttachment, openLeaveAttachment, LeaveRequest } from '@/api/leave.api'

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
  const uploadAttachment = useUploadLeaveAttachment()
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null)

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadTargetId) return
    try {
      await uploadAttachment.mutateAsync({ id: uploadTargetId, file })
      toast({ title: '附件已上傳' })
    } catch {
      toast({ variant: 'destructive', title: '上傳失敗' })
    } finally {
      setUploadTargetId(null)
      e.target.value = ''
    }
  }

  const triggerUpload = (id: string) => {
    setUploadTargetId(id)
    fileInputRef.current?.click()
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
      render: (r) => (
        <div className="flex items-center gap-1">
          {r.attachment_path ? (
            <Button size="sm" variant="ghost" onClick={() => openLeaveAttachment(r.id)} title="查看證明">
              <FileText className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="text-amber-600" onClick={() => triggerUpload(r.id)} title="上傳請假證明">
              <Upload className="h-4 w-4" />
            </Button>
          )}
          {['pending', 'approved'].includes(r.status) && (
            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setCancelTarget(r)}>
              取消
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileSelect}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
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
