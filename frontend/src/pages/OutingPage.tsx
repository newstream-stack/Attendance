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

function getWeekRange() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
  const day = now.getDay() // 0=Sun
  const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-CA')
  return { start: fmt(mon), end: fmt(sun) }
}

const schema = z.object({
  outing_date: z.string().min(1, '請選擇外出日期'),
  outing_time: z.string().optional(),
  outing_type: z.string().optional(),
  destination: z.string().min(1, '請填寫外出地點').max(200),
  note: z.string().max(500).optional(),
})
type FormData = z.infer<typeof schema>

function fmtTime(t: string | null | undefined) {
  if (!t) return '—'
  return t.slice(0, 5) // HH:MM:SS → HH:MM
}

export default function OutingPage() {
  const { toast } = useToast()
  const defaultRange = getWeekRange()
  const [rangeStart, setRangeStart] = useState(defaultRange.start)
  const [rangeEnd, setRangeEnd] = useState(defaultRange.end)
  const [appliedStart, setAppliedStart] = useState(defaultRange.start)
  const [appliedEnd, setAppliedEnd] = useState(defaultRange.end)

  const { data: outings = [], isLoading } = useMyOutings({ start: appliedStart, end: appliedEnd })
  const submit = useSubmitOuting()
  const deleteOuting = useDeleteOuting()
  const [deleteTarget, setDeleteTarget] = useState<OutingRecord | null>(null)

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })

  const applyRange = () => {
    setAppliedStart(rangeStart)
    setAppliedEnd(rangeEnd)
  }

  const resetToWeek = () => {
    const r = getWeekRange()
    setRangeStart(r.start); setRangeEnd(r.end)
    setAppliedStart(r.start); setAppliedEnd(r.end)
  }

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { outing_date: today, outing_time: '', outing_type: 'none', destination: '', note: '' },
  })

  const onSubmit = (data: FormData) => {
    submit.mutate({
      outing_date: data.outing_date,
      outing_time: data.outing_time || null,
      outing_type: data.outing_type === 'none' ? null : (data.outing_type ?? null),
      destination: data.destination,
      note: data.note || null,
    }, {
      onSuccess: () => {
        toast({ title: '外出單已送出' })
        reset({ outing_date: today, outing_time: '', outing_type: 'none', destination: '', note: '' })
      },
      onError: () => toast({ title: '送出失敗', variant: 'destructive' }),
    })
  }

  const columns: Column<OutingRecord>[] = [
    {
      key: 'outing_date', header: '外出日期', sortable: true,
      render: (r) => new Date(r.outing_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }),
    },
    { key: 'outing_time', header: '時間', render: (r) => fmtTime(r.outing_time) },
    { key: 'outing_type', header: '項目', render: (r) => r.outing_type ?? '—' },
    { key: 'destination', header: '外出地點' },
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
              <div className="flex gap-2 flex-wrap items-center">
                <Input type="date" className="flex-1 min-w-[140px]" {...register('outing_date')} />
                <Input type="time" className="w-32" {...register('outing_time')} />
              </div>
            </FormField>

            <FormField label="項目">
              <Controller
                control={control}
                name="outing_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="請選擇項目（選填）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">不選擇</SelectItem>
                      <SelectItem value="公出">公出</SelectItem>
                      <SelectItem value="出差">出差</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="外出地點" error={errors.destination?.message} required>
              <Input placeholder="例如：台北市信義區客戶辦公室" {...register('destination')} />
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
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <h2 className="text-lg font-semibold text-slate-800 mr-2">我的外出記錄</h2>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="w-36"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
            />
            <span className="text-slate-400">～</span>
            <Input
              type="date"
              className="w-36"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={applyRange}>查詢</Button>
          <Button variant="ghost" size="sm" onClick={resetToWeek}>本週</Button>
        </div>
        <DataTable
          data={outings as unknown as Record<string, unknown>[]}
          columns={columns as Column<Record<string, unknown>>[]}
          emptyText={isLoading ? '載入中…' : '此區間無外出記錄'}
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
