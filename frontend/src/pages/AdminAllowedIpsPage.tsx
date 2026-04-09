import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { FormField } from '@/components/shared/FormField'
import { DataTable, Column } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { useAllowedIps, useCreateAllowedIp, useDeleteAllowedIp, AllowedIpRow } from '@/api/allowedIps.api'

const schema = z.object({
  ip_address: z.string().min(1, '請輸入 IP 位址'),
  label: z.string().max(100).optional(),
})

type FormData = z.infer<typeof schema>

export default function AdminAllowedIpsPage() {
  const { toast } = useToast()
  const { data: ips = [], isLoading } = useAllowedIps()
  const createIp = useCreateAllowedIp()
  const deleteIp = useDeleteAllowedIp()

  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AllowedIpRow | null>(null)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const handleAdd = async (data: FormData) => {
    try {
      await createIp.mutateAsync({ ip_address: data.ip_address, label: data.label || null })
      toast({ title: 'IP 已新增' })
      setAddOpen(false)
      reset()
    } catch {
      toast({ variant: 'destructive', title: '新增失敗', description: 'IP 格式錯誤或已存在' })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteIp.mutateAsync(deleteTarget.id)
      toast({ title: 'IP 已刪除' })
    } catch {
      toast({ variant: 'destructive', title: '刪除失敗' })
    } finally {
      setDeleteTarget(null)
    }
  }

  const columns: Column<AllowedIpRow>[] = [
    { key: 'ip_address', header: 'IP 位址', sortable: true },
    { key: 'label', header: '備註', render: (row) => row.label ?? '—' },
    {
      key: 'created_at', header: '新增時間',
      render: (row) => new Date(row.created_at).toLocaleDateString('zh-TW'),
    },
    {
      key: 'actions', header: '',
      render: (row) => (
        <Button
          size="sm"
          variant="ghost"
          className="text-red-500 hover:text-red-600"
          onClick={() => setDeleteTarget(row)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">允許打卡 IP</h1>
          <p className="text-sm text-muted-foreground mt-1">只有在以下 IP 範圍內才能打卡</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> 新增 IP
        </Button>
      </div>

      <DataTable
        data={ips as unknown as Record<string, unknown>[]}
        columns={columns as Column<Record<string, unknown>>[]}
        emptyText={isLoading ? '載入中...' : '尚無允許的 IP'}
      />

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增允許 IP</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(handleAdd)} className="space-y-3">
            <FormField label="IP 位址" error={errors.ip_address} required>
              <Input placeholder="例：192.168.1.100" {...register('ip_address')} />
            </FormField>
            <FormField label="備註" error={errors.label}>
              <Input placeholder="例：總公司" {...register('label')} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>取消</Button>
              <Button type="submit" disabled={createIp.isPending}>
                {createIp.isPending ? '新增中...' : '新增'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="刪除 IP"
        description={`確定要刪除 ${deleteTarget?.ip_address}？`}
        confirmLabel="刪除"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
