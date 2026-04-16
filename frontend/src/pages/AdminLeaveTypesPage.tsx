import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormField } from '@/components/shared/FormField'
import { DataTable, Column } from '@/components/shared/DataTable'
import { useToast } from '@/hooks/use-toast'
import { useLeaveTypes, useCreateLeaveType, useUpdateLeaveType, LeaveType } from '@/api/leave.api'

const schema = z.object({
  code: z.string().min(1).max(30),
  name_zh: z.string().min(1).max(50),
  name_en: z.string().min(1).max(50),
  is_paid: z.boolean(),
  requires_balance: z.boolean(),
  requires_attachment: z.boolean().default(false),
  max_days_per_year: z.number().int().positive().nullable().optional(),
  carry_over_days: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
})

type FormData = z.infer<typeof schema>

export default function AdminLeaveTypesPage() {
  const { toast } = useToast()
  const { data: types = [], isLoading } = useLeaveTypes()
  const createType = useCreateLeaveType()
  const updateType = useUpdateLeaveType()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<LeaveType | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_paid: true, requires_balance: false, requires_attachment: false, carry_over_days: 0, is_active: true },
  })

  const openEdit = (t: LeaveType) => {
    setEditTarget(t)
    form.reset({
      code: t.code, name_zh: t.name_zh, name_en: t.name_en,
      is_paid: t.is_paid, requires_balance: t.requires_balance,
      requires_attachment: t.requires_attachment,
      max_days_per_year: t.max_days_per_year ?? undefined,
      carry_over_days: t.carry_over_days, is_active: t.is_active,
    })
  }

  const onSubmit = async (data: FormData) => {
    try {
      if (editTarget) {
        await updateType.mutateAsync({ id: editTarget.id, payload: data })
        toast({ title: '已更新' })
        setEditTarget(null)
      } else {
        await createType.mutateAsync(data as Omit<LeaveType, 'id'>)
        toast({ title: '假別已建立' })
        setCreateOpen(false)
      }
      form.reset()
    } catch {
      toast({ variant: 'destructive', title: '操作失敗' })
    }
  }

  const columns: Column<LeaveType>[] = [
    { key: 'code', header: 'Code', sortable: true },
    { key: 'name_zh', header: '名稱', sortable: true },
    { key: 'is_paid', header: '有薪', render: (r) => r.is_paid ? '是' : '否' },
    { key: 'requires_balance', header: '需有餘額', render: (r) => r.requires_balance ? '是' : '否' },
    { key: 'requires_attachment', header: '需附證明', render: (r) => r.requires_attachment ? '是' : '否' },
    { key: 'max_days_per_year', header: '年限天數', render: (r) => r.max_days_per_year ?? '無限制' },
    { key: 'is_active', header: '狀態', render: (r) => <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? '啟用' : '停用'}</Badge> },
    { key: 'actions', header: '', render: (r) => <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button> },
  ]

  const dialogOpen = createOpen || !!editTarget

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">假別設定</h1>
        <Button onClick={() => { setCreateOpen(true); form.reset({ is_paid: true, requires_balance: false, requires_attachment: false, carry_over_days: 0, is_active: true }) }}>
          <Plus className="h-4 w-4 mr-1" />新增假別
        </Button>
      </div>

      <DataTable
        data={types as unknown as Record<string, unknown>[]}
        columns={columns as Column<Record<string, unknown>>[]}
        emptyText={isLoading ? '載入中...' : '尚無假別'}
      />

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditTarget(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? `編輯 ${editTarget.name_zh}` : '新增假別'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Code" error={form.formState.errors.code} required>
                <Input placeholder="例：annual" {...form.register('code')} disabled={!!editTarget} />
              </FormField>
              <FormField label="中文名稱" error={form.formState.errors.name_zh} required>
                <Input placeholder="例：年假" {...form.register('name_zh')} />
              </FormField>
            </div>
            <FormField label="英文名稱" error={form.formState.errors.name_en} required>
              <Input placeholder="Annual Leave" {...form.register('name_en')} />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="有薪" error={form.formState.errors.is_paid} required>
                <Controller name="is_paid" control={form.control} render={({ field }) => (
                  <Select onValueChange={(v) => field.onChange(v === 'true')} value={String(field.value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">是</SelectItem>
                      <SelectItem value="false">否</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="需有餘額" error={form.formState.errors.requires_balance} required>
                <Controller name="requires_balance" control={form.control} render={({ field }) => (
                  <Select onValueChange={(v) => field.onChange(v === 'true')} value={String(field.value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">是</SelectItem>
                      <SelectItem value="false">否</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="需附證明" error={form.formState.errors.requires_attachment} required>
                <Controller name="requires_attachment" control={form.control} render={({ field }) => (
                  <Select onValueChange={(v) => field.onChange(v === 'true')} value={String(field.value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">是</SelectItem>
                      <SelectItem value="false">否</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField label="狀態" error={form.formState.errors.is_active} required>
                <Controller name="is_active" control={form.control} render={({ field }) => (
                  <Select onValueChange={(v) => field.onChange(v === 'true')} value={String(field.value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">啟用</SelectItem>
                      <SelectItem value="false">停用</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="年限天數（留空=無限制）" error={form.formState.errors.max_days_per_year}>
                <Input type="number" min={1} {...form.register('max_days_per_year', { setValueAs: v => (v === '' || v === null || v === undefined) ? null : (isNaN(Number(v)) ? null : Number(v)) })} />
              </FormField>
              <FormField label="可攜帶天數" error={form.formState.errors.carry_over_days} required>
                <Input type="number" min={0} {...form.register('carry_over_days', { valueAsNumber: true })} />
              </FormField>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); setEditTarget(null) }}>取消</Button>
              <Button type="submit" disabled={createType.isPending || updateType.isPending}>
                {editTarget ? '儲存' : '建立'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
