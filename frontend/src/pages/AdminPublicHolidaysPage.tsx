import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Trash2, Plus, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/shared/FormField'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { MonthCalendar } from '@/components/shared/MonthCalendar'
import { useToast } from '@/hooks/use-toast'
import {
  usePublicHolidays, useCreatePublicHoliday, useDeletePublicHoliday, useImportTaiwanHolidays, PublicHoliday,
} from '@/api/publicHoliday.api'

const schema = z.object({
  holiday_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '請選擇日期'),
  name: z.string().min(1, '請輸入名稱').max(100),
})
type FormData = z.infer<typeof schema>

function toDateKey(raw: string): string {
  if (!raw) return ''
  if (raw.length === 10) return raw
  return new Date(raw).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
}

export default function AdminPublicHolidaysPage() {
  const { toast } = useToast()
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailTarget, setDetailTarget] = useState<PublicHoliday | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PublicHoliday | null>(null)
  const [importConfirmOpen, setImportConfirmOpen] = useState(false)

  const { data: holidays = [], isLoading } = usePublicHolidays(year)
  const createHoliday = useCreatePublicHoliday()
  const deleteHoliday = useDeletePublicHoliday()
  const importHolidays = useImportTaiwanHolidays()

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { holiday_date: `${year}-01-01`, name: '' },
  })

  const onSubmit = (data: FormData) => {
    createHoliday.mutate(data, {
      onSuccess: () => {
        toast({ title: '公假已新增' })
        setCreateOpen(false)
        reset({ holiday_date: `${year}-01-01`, name: '' })
      },
      onError: (err: any) => {
        toast({ title: err?.response?.data?.message ?? '新增失敗', variant: 'destructive' })
      },
    })
  }

  const handleImport = () => {
    importHolidays.mutate(year, {
      onSuccess: ({ inserted }) => {
        toast({ title: inserted > 0 ? `匯入完成，新增 ${inserted} 筆假期` : '匯入完成（已是最新資料）' })
        setImportConfirmOpen(false)
      },
      onError: (err: any) => {
        toast({ title: err?.response?.data?.message ?? '匯入失敗', variant: 'destructive' })
        setImportConfirmOpen(false)
      },
    })
  }

  /** Click on a holiday day → show detail/delete dialog.
   *  Click on an empty day → open create form with date pre-filled. */
  const handleDayClick = (date: string, holiday: PublicHoliday | undefined) => {
    if (holiday) {
      setDetailTarget(holiday)
    } else {
      setValue('holiday_date', date)
      setValue('name', '')
      setCreateOpen(true)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">公假管理</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            type="number"
            className="w-28"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            min={2020}
            max={2100}
          />
          <Button
            variant="outline"
            onClick={() => setImportConfirmOpen(true)}
            disabled={importHolidays.isPending || year < 2024 || year > 2027}
          >
            <Download className="h-4 w-4 mr-1" />匯入台灣假期
          </Button>
          <Button onClick={() => { reset({ holiday_date: `${year}-01-01`, name: '' }); setCreateOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" />新增公假
          </Button>
        </div>
      </div>

      {/* Legend */}
      <p className="text-xs text-slate-400">點選紅色日期可查看假期名稱或取消；點選其他日期可新增公假</p>

      {isLoading ? (
        <p className="text-slate-500">載入中…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
            <MonthCalendar
              key={month}
              year={year}
              month={month}
              holidays={holidays}
              onDayClick={handleDayClick}
            />
          ))}
        </div>
      )}

      {/* Holiday detail dialog — shown when user clicks a holiday day */}
      <Dialog open={!!detailTarget} onOpenChange={(o) => { if (!o) setDetailTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>假期資訊</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-3">
              <span className="text-sm text-slate-500 w-12 shrink-0">日期</span>
              <span className="text-sm font-medium text-slate-800">
                {detailTarget ? toDateKey(detailTarget.holiday_date) : ''}
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-sm text-slate-500 w-12 shrink-0">名稱</span>
              <span className="text-sm font-medium text-slate-800">{detailTarget?.name}</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailTarget(null)}>關閉</Button>
            <Button
              variant="destructive"
              onClick={() => { setDeleteTarget(detailTarget); setDetailTarget(null) }}
            >
              <Trash2 className="h-4 w-4 mr-1" />取消假期
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog — also opens when clicking an empty day */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>新增公假</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="日期" error={errors.holiday_date?.message}>
              <Input type="date" {...register('holiday_date')} />
            </FormField>
            <FormField label="名稱" error={errors.name?.message}>
              <Input placeholder="例如：元旦" {...register('name')} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
              <Button type="submit" disabled={createHoliday.isPending}>新增</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import confirm */}
      <ConfirmDialog
        open={importConfirmOpen}
        onOpenChange={(o) => { if (!o) setImportConfirmOpen(false) }}
        title={`匯入 ${year} 年台灣假期`}
        description={`將匯入 ${year} 年台灣官定假期（僅支援 2024–2027），已存在的日期會自動略過。`}
        confirmLabel="匯入"
        onConfirm={handleImport}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
        title="確認取消假期"
        description={`確定要取消「${deleteTarget?.name}（${deleteTarget ? toDateKey(deleteTarget.holiday_date) : ''}）」？`}
        confirmLabel="取消假期"
        variant="destructive"
        onConfirm={() => {
          if (!deleteTarget) return
          deleteHoliday.mutate(deleteTarget.id, {
            onSuccess: () => { toast({ title: '假期已取消' }); setDeleteTarget(null) },
            onError: () => toast({ title: '操作失敗', variant: 'destructive' }),
          })
        }}
      />
    </div>
  )
}
