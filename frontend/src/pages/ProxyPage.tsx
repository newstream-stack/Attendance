import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormField } from '@/components/shared/FormField'
import { DataTable, Column } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { useMyProxies, useCreateProxy, useUpdateProxy, useDeleteProxy, ProxyAssignment } from '@/api/proxy.api'
import { useColleagues } from '@/api/users.api'
import { useAuthStore } from '@/store/authStore'

const SCOPE_LABELS = { leave_approval: '請假簽核', all: '全部簽核' }

const schema = z.object({
  proxy_id: z.string().uuid('請選擇代理人'),
  start_date: z.string().min(1, '請選擇開始日'),
  end_date: z.string().min(1, '請選擇結束日'),
  scope: z.enum(['leave_approval', 'all']),
}).refine((d) => d.start_date <= d.end_date, { message: '結束日不得早於開始日', path: ['end_date'] })

type FormData = z.infer<typeof schema>

export default function ProxyPage() {
  const { toast } = useToast()
  const { data: proxies = [], isLoading } = useMyProxies()
  const { user: currentUser } = useAuthStore()
  const { data: colleagues = [] } = useColleagues()
  const proxyOptions = colleagues.filter((u) => u.id !== currentUser?.id)
  const createProxy = useCreateProxy()
  const updateProxy = useUpdateProxy()
  const deleteProxy = useDeleteProxy()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProxyAssignment | null>(null)

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { scope: 'leave_approval' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      await createProxy.mutateAsync(data)
      toast({ title: '代理人已設定' })
      setAddOpen(false)
      reset()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? '設定失敗'
      toast({ variant: 'destructive', title: '設定失敗', description: msg })
    }
  }

  const handleToggle = async (p: ProxyAssignment) => {
    try {
      await updateProxy.mutateAsync({ id: p.id, payload: { is_active: !p.is_active } })
      toast({ title: p.is_active ? '已停用' : '已啟用' })
    } catch {
      toast({ variant: 'destructive', title: '操作失敗' })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteProxy.mutateAsync(deleteTarget.id)
      toast({ title: '已刪除' })
    } catch {
      toast({ variant: 'destructive', title: '刪除失敗' })
    } finally {
      setDeleteTarget(null)
    }
  }

  const columns: Column<ProxyAssignment>[] = [
    { key: 'proxy_name', header: '代理人', sortable: true },
    { key: 'start_date', header: '開始日' },
    { key: 'end_date', header: '結束日' },
    { key: 'scope', header: '範圍', render: (r) => SCOPE_LABELS[r.scope] },
    { key: 'is_active', header: '狀態', render: (r) => <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? '啟用' : '停用'}</Badge> },
    {
      key: 'actions', header: '',
      render: (r) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" title={r.is_active ? '停用' : '啟用'} onClick={() => handleToggle(r)}>
            {r.is_active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-slate-400" />}
          </Button>
          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setDeleteTarget(r)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">代理人設定</h1>
          <p className="text-sm text-muted-foreground mt-1">設定不在時由誰代為處理簽核</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />新增代理
        </Button>
      </div>

      <DataTable
        data={proxies as unknown as Record<string, unknown>[]}
        columns={columns as Column<Record<string, unknown>>[]}
        emptyText={isLoading ? '載入中...' : '尚無代理設定'}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增代理人</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <FormField label="代理人" error={errors.proxy_id} required>
              <Controller name="proxy_id" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="選擇代理人" /></SelectTrigger>
                  <SelectContent>
                    {proxyOptions.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name}（{m.employee_id}）</SelectItem>
                    ))}
                    {proxyOptions.length === 0 && (
                      <SelectItem value="_empty" disabled>目前無可選擇的代理人</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="開始日" error={errors.start_date} required>
                <Input type="date" {...register('start_date')} />
              </FormField>
              <FormField label="結束日" error={errors.end_date} required>
                <Input type="date" {...register('end_date')} />
              </FormField>
            </div>
            <FormField label="代理範圍" error={errors.scope} required>
              <Controller name="scope" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leave_approval">請假簽核</SelectItem>
                    <SelectItem value="all">全部簽核</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>取消</Button>
              <Button type="submit" disabled={createProxy.isPending}>
                {createProxy.isPending ? '設定中...' : '確認設定'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="刪除代理設定"
        description={`確定要刪除 ${deleteTarget?.proxy_name} 的代理設定？`}
        confirmLabel="刪除"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
