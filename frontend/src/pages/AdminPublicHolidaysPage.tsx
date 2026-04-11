import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/shared/FormField'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { usePublicHolidays, useCreatePublicHoliday, useDeletePublicHoliday, PublicHoliday } from '@/api/publicHoliday.api'

const schema = z.object({
  holiday_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '請選擇日期'),
  name: z.string().min(1, '請輸入名稱').max(100),
})
type FormData = z.infer<typeof schema>

export default function AdminPublicHolidaysPage() {
  const { toast } = useToast()
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PublicHoliday | null>(null)

  const { data: holidays = [], isLoading } = usePublicHolidays(year)
  const createHoliday = useCreatePublicHoliday()
  const deleteHoliday = useDeletePublicHoliday()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
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

  const columns = [
    { key: 'holiday_date', header: '日期' },
    { key: 'name', header: '名稱' },
    {
      key: 'actions',
      header: '',
      render: (row: PublicHoliday) => (
        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700"
          onClick={() => setDeleteTarget(row)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">公假管理</h1>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            className="w-28"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            min={2020}
            max={2100}
          />
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />新增公假
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-slate-500">載入中…</p>
      ) : (
        <DataTable data={holidays as any[]} columns={columns as any} emptyText="該年度尚無公假記錄" />
      )}

      {/* Create dialog */}
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

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
        title="確認刪除"
        description={`確定要刪除「${deleteTarget?.name}（${deleteTarget?.holiday_date}）」？`}
        confirmLabel="刪除"
        variant="destructive"
        onConfirm={() => {
          if (!deleteTarget) return
          deleteHoliday.mutate(deleteTarget.id, {
            onSuccess: () => { toast({ title: '已刪除' }); setDeleteTarget(null) },
            onError: () => toast({ title: '刪除失敗', variant: 'destructive' }),
          })
        }}
      />
    </div>
  )
}
