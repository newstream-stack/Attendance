import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { FormField } from '@/components/shared/FormField'
import { DataTable, Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { useMyOvertimeRequests, useSubmitOvertimeRequest, useCancelOvertimeRequest, OvertimeRequest } from '@/api/overtime.api'

const schema = z.object({
  work_date: z.string().min(1, '請選擇加班日期'),
  start_time: z.string().min(1, '請輸入開始時間'),
  end_time: z.string().min(1, '請輸入結束時間'),
  reason: z.string().max(500).optional(),
  convert_to_comp: z.boolean().default(false),
})

type FormData = z.infer<typeof schema>

function fmtMins(mins: number) {
  return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`
}

export default function OvertimeApplyPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: requests = [], isLoading } = useMyOvertimeRequests()
  const submitRequest = useSubmitOvertimeRequest()
  const cancelRequest = useCancelOvertimeRequest()
  const [cancelTarget, setCancelTarget] = useState<OvertimeRequest | null>(null)
  const [convertToComp, setConvertToComp] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { convert_to_comp: false },
  })

  const onSubmit = async (data: FormData) => {
    try {
      const startISO = `${data.work_date}T${data.start_time}:00+08:00`
      const endISO = `${data.work_date}T${data.end_time}:00+08:00`
      await submitRequest.mutateAsync({
        work_date: data.work_date,
        start_time: startISO,
        end_time: endISO,
        reason: data.reason || null,
        convert_to_comp: data.convert_to_comp,
      })
      toast({ title: '加班申請已送出', description: '等待主管審核' })
      reset({ convert_to_comp: false })
      setConvertToComp(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? '送出失敗'
      toast({ variant: 'destructive', title: '申請失敗', description: msg })
    }
  }

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

  const columns: Column<OvertimeRequest>[] = [
    { key: 'work_date', header: '加班日期', sortable: true, render: (r) => new Date(r.work_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }) },
    { key: 'start_time', header: '開始', render: (r) => new Date(r.start_time).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }) },
    { key: 'end_time', header: '結束', render: (r) => new Date(r.end_time).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }) },
    { key: 'duration_mins', header: '時數', render: (r) => fmtMins(r.duration_mins) },
    { key: 'convert_to_comp', header: '轉補休', render: (r) => r.convert_to_comp ? '是' : '否' },
    { key: 'status', header: '狀態', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '',
      render: (r) => r.status === 'pending' ? (
        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setCancelTarget(r)}>取消</Button>
      ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">加班申請</h1>

      <Card className="max-w-lg">
        <CardHeader><CardTitle className="text-base">填寫加班資訊</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="加班日期" error={errors.work_date} required>
              <Input type="date" {...register('work_date')} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="開始時間" error={errors.start_time} required>
                <Input type="time" {...register('start_time')} />
              </FormField>
              <FormField label="結束時間" error={errors.end_time} required>
                <Input type="time" {...register('end_time')} />
              </FormField>
            </div>
            <FormField label="原因" error={errors.reason}>
              <textarea
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring min-h-[70px] resize-none"
                placeholder="選填"
                {...register('reason')}
              />
            </FormField>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={convertToComp}
                onCheckedChange={(v) => {
                  setConvertToComp(!!v)
                  setValue('convert_to_comp', !!v)
                }}
              />
              <span className="text-sm">核准後轉補休假（自動加入補休餘額）</span>
            </label>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>取消</Button>
              <Button type="submit" disabled={submitRequest.isPending}>
                {submitRequest.isPending ? '送出中...' : '送出申請'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-medium mb-3">我的加班紀錄</h2>
        <DataTable
          data={requests as unknown as Record<string, unknown>[]}
          columns={columns as Column<Record<string, unknown>>[]}
          emptyText={isLoading ? '載入中...' : '尚無加班紀錄'}
        />
      </div>

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="取消加班申請"
        description={`確定要取消 ${cancelTarget?.work_date ?? ''} 的加班申請？`}
        confirmLabel="確定取消"
        onConfirm={handleCancel}
      />
    </div>
  )
}
