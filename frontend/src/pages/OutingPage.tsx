import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormField } from '@/components/shared/FormField'
import { DataTable, Column } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { useMyOutings, useSubmitOuting, useDeleteOuting, OutingRecord } from '@/api/outing.api'
import { useLeaveTypes } from '@/api/leave.api'

const schema = z.object({
  outing_date: z.string().min(1, '請選擇外出日期'),
  destination: z.string().min(1, '請填寫外出地點').max(200),
  leave_type_id: z.string().optional(),
  note: z.string().max(500).optional(),
})
type FormData = z.infer<typeof schema>

export default function OutingPage() {
  const { toast } = useToast()
  const { data: outings = [], isLoading } = useMyOutings()
  const { data: leaveTypes = [] } = useLeaveTypes()
  const submit = useSubmitOuting()
  const deleteOuting = useDeleteOuting()
  const [deleteTarget, setDeleteTarget] = useState<OutingRecord | null>(null)

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { outing_date: today, destination: '', leave_type_id: 'none', note: '' },
  })

  const onSubmit = (data: FormData) => {
    submit.mutate({
      outing_date: data.outing_date,
      destination: data.destination,
      leave_type_id: data.leave_type_id === 'none' ? null : (data.leave_type_id ?? null),
      note: data.note || null,
    }, {
      onSuccess: () => {
        toast({ title: '外出單已送出' })
        reset({ outing_date: today, destination: '', leave_type_id: 'none', note: '' })
      },
      onError: () => toast({ title: '送出失敗', variant: 'destructive' }),
    })
  }

  const columns: Column<OutingRecord>[] = [
    {
      key: 'outing_date', header: '外出日期', sortable: true,
      render: (r) => new Date(r.outing_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }),
    },
    { key: 'destination', header: '外出地點' },
    { key: 'leave_type_name', header: '假別', render: (r) => r.leave_type_name ?? '—' },
    { key: 'note', header: '備註', render: (r) => r.note ?? '—' },
    {
      key: 'actions', header: '',
      render: (r) => (
        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700"
          onClick={() => setDeleteTarget(r)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">外出單</h1>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">填寫外出記錄</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="外出日期" error={errors.outing_date?.message} required>
              <Input type="date" {...register('outing_date')} />
            </FormField>

            <FormField label="外出地點" error={errors.destination?.message} required>
              <Input placeholder="例如：台北市信義區客戶辦公室" {...register('destination')} />
            </FormField>

            <FormField label="假別" error={errors.leave_type_id?.message}>
              <Controller
                control={control}
                name="leave_type_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="請選擇假別（選填）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不選擇</SelectItem>
                      {leaveTypes.map((lt) => (
                        <SelectItem key={lt.id} value={lt.id}>{lt.name_zh}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="備註" error={errors.note?.message}>
              <Input placeholder="選填" {...register('note')} />
            </FormField>

            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? '送出中…' : '送出外出單'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">我的外出記錄</h2>
        <DataTable
          data={outings as unknown as Record<string, unknown>[]}
          columns={columns as Column<Record<string, unknown>>[]}
          emptyText={isLoading ? '載入中…' : '尚無外出記錄'}
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
        title="刪除外出記錄"
        description={`確定要刪除 ${deleteTarget?.outing_date} 至 ${deleteTarget?.destination} 的外出記錄？`}
        confirmLabel="刪除"
        variant="destructive"
        onConfirm={() => {
          if (!deleteTarget) return
          deleteOuting.mutate(deleteTarget.id, {
            onSuccess: () => { toast({ title: '已刪除' }); setDeleteTarget(null) },
            onError: () => toast({ title: '刪除失敗', variant: 'destructive' }),
          })
        }}
      />
    </div>
  )
}
