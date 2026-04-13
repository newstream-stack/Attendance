import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/shared/FormField'
import { DataTable, Column } from '@/components/shared/DataTable'
import { useToast } from '@/hooks/use-toast'
import { useDepartments, useCreateDepartment, useUpdateDepartment, Department } from '@/api/departments.api'

const schema = z.object({
  name: z.string().min(1, '必填').max(100),
  description: z.string().max(255).nullable().optional(),
})

type FormData = z.infer<typeof schema>

export default function AdminDepartmentsPage() {
  const { toast } = useToast()
  const { data: departments = [], isLoading } = useDepartments()
  const createDept = useCreateDepartment()
  const updateDept = useUpdateDepartment()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Department | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' },
  })

  const openCreate = () => {
    form.reset({ name: '', description: '' })
    setCreateOpen(true)
  }

  const openEdit = (dept: Department) => {
    setEditTarget(dept)
    form.reset({ name: dept.name, description: dept.description ?? '' })
  }

  const onSubmit = async (data: FormData) => {
    const payload = { ...data, description: data.description || null }
    try {
      if (editTarget) {
        await updateDept.mutateAsync({ id: editTarget.id, payload })
        toast({ title: '部門已更新' })
        setEditTarget(null)
      } else {
        await createDept.mutateAsync(payload)
        toast({ title: '部門已建立' })
        setCreateOpen(false)
      }
      form.reset()
    } catch {
      toast({ variant: 'destructive', title: '操作失敗' })
    }
  }

  const toggleActive = async (dept: Department) => {
    try {
      await updateDept.mutateAsync({ id: dept.id, payload: { is_active: !dept.is_active } })
      toast({ title: dept.is_active ? '已停用' : '已啟用' })
    } catch {
      toast({ variant: 'destructive', title: '操作失敗' })
    }
  }

  const columns: Column<Department>[] = [
    { key: 'name', header: '部門名稱', sortable: true },
    { key: 'description', header: '說明', render: (r) => r.description ?? '—' },
    {
      key: 'is_active',
      header: '狀態',
      render: (r) => <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? '啟用' : '停用'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toggleActive(r)}>
            {r.is_active ? '停用' : '啟用'}
          </Button>
        </div>
      ),
    },
  ]

  const dialogOpen = createOpen || !!editTarget

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">部門管理</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />新增部門
        </Button>
      </div>

      <DataTable
        data={departments as unknown as Record<string, unknown>[]}
        columns={columns as Column<Record<string, unknown>>[]}
        emptyText={isLoading ? '載入中...' : '尚無部門'}
      />

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditTarget(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? `編輯部門：${editTarget.name}` : '新增部門'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField label="部門名稱" error={form.formState.errors.name} required>
              <Input placeholder="例：工程部" {...form.register('name')} />
            </FormField>
            <FormField label="說明" error={form.formState.errors.description}>
              <Textarea placeholder="部門說明（選填）" rows={3} {...form.register('description')} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); setEditTarget(null) }}>
                取消
              </Button>
              <Button type="submit" disabled={createDept.isPending || updateDept.isPending}>
                {editTarget ? '儲存' : '建立'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
