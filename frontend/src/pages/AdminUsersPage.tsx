import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, UserCheck, UserX, KeyRound, Copy, Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { FormField } from '@/components/shared/FormField'
import { DataTable, Column } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import {
  useUsers, useManagers, useCreateUser, useUpdateUser, useToggleUserActive,
  useAdminResetPassword, useDeleteUser,
  UserRow, CreateUserPayload, UpdateUserPayload,
} from '@/api/users.api'
import { useDepartments } from '@/api/departments.api'

const ROLE_LABELS: Record<string, string> = {
  admin: '管理員', manager: '主管', employee: '員工',
}

const createSchema = z.object({
  employee_id: z.string().min(1, '請輸入員工編號').max(20),
  email: z.string().email('請輸入有效 Email'),
  full_name: z.string().min(1, '請輸入姓名').max(100),
  role: z.enum(['admin', 'manager', 'employee']),
  department: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  hire_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '格式須為 YYYY-MM-DD'),
  manager_id: z.string().uuid().nullable().optional(),
})

const editSchema = createSchema.omit({ employee_id: true })

type CreateForm = z.infer<typeof createSchema>
type EditForm = z.infer<typeof editSchema>

export default function AdminUsersPage() {
  const { toast } = useToast()
  const { data: users = [], isLoading } = useUsers()
  const { data: managers = [] } = useManagers()
  const { data: departments = [] } = useDepartments()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const toggleActive = useToggleUserActive()
  const resetPassword = useAdminResetPassword()
  const deleteUser = useDeleteUser()

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<UserRow | null>(null)
  const [toggleTarget, setToggleTarget] = useState<UserRow | null>(null)
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'employee', manager_id: null },
  })

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  })

  const handleCreate = async (data: CreateForm) => {
    try {
      await createUser.mutateAsync(data as CreateUserPayload)
      toast({ title: '員工已建立', description: '歡迎信已發送至員工 Email' })
      setCreateOpen(false)
      createForm.reset({ role: 'employee', manager_id: null })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast({ variant: 'destructive', title: '建立失敗', description: msg ?? '請確認員工編號與 Email 是否重複' })
    }
  }

  const openEdit = (user: UserRow) => {
    setEditTarget(user)
    editForm.reset({
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      department: user.department ?? '',
      position: user.position ?? '',
      hire_date: user.hire_date.slice(0, 10),
      manager_id: user.manager_id,
    })
  }

  const handleEdit = async (data: EditForm) => {
    if (!editTarget) return
    try {
      await updateUser.mutateAsync({ id: editTarget.id, payload: data as UpdateUserPayload })
      toast({ title: '已更新' })
      setEditTarget(null)
    } catch {
      toast({ variant: 'destructive', title: '更新失敗' })
    }
  }

  const handleToggle = async () => {
    if (!toggleTarget) return
    try {
      await toggleActive.mutateAsync({ id: toggleTarget.id, isActive: !toggleTarget.is_active })
      toast({ title: toggleTarget.is_active ? '已停用' : '已啟用' })
    } catch {
      toast({ variant: 'destructive', title: '操作失敗' })
    } finally {
      setToggleTarget(null)
    }
  }

  const handleReset = async () => {
    if (!resetTarget) return
    try {
      const { password } = await resetPassword.mutateAsync(resetTarget.id)
      setResetTarget(null)
      setNewPassword(password)
      setCopied(false)
    } catch {
      toast({ variant: 'destructive', title: '重設失敗' })
    }
  }

  const copyPassword = () => {
    if (!newPassword) return
    navigator.clipboard.writeText(newPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteUser.mutateAsync(deleteTarget.id)
      toast({ title: `已刪除員工 ${deleteTarget.full_name}` })
    } catch {
      toast({ variant: 'destructive', title: '刪除失敗' })
    } finally {
      setDeleteTarget(null)
    }
  }

  const columns: Column<UserRow>[] = [
    { key: 'employee_id', header: '員工編號', sortable: true },
    { key: 'full_name', header: '姓名', sortable: true },
    { key: 'email', header: 'Email' },
    {
      key: 'role', header: '角色',
      render: (row) => <Badge variant="outline">{ROLE_LABELS[row.role]}</Badge>,
    },
    { key: 'department', header: '部門', render: (row) => row.department ?? '—' },
    {
      key: 'is_active', header: '狀態',
      render: (row) => (
        <Badge variant={row.is_active ? 'default' : 'secondary'}>
          {row.is_active ? '在職' : '停用'}
        </Badge>
      ),
    },
    {
      key: 'actions', header: '',
      render: (row) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => openEdit(row)} title="編輯">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setResetTarget(row)} title="重設密碼">
            <KeyRound className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={row.is_active ? 'text-red-500 hover:text-red-600' : 'text-green-600 hover:text-green-700'}
            onClick={() => setToggleTarget(row)}
            title={row.is_active ? '停用' : '啟用'}
          >
            {row.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500 hover:text-red-600"
            onClick={() => setDeleteTarget(row)}
            title="刪除"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">員工管理</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> 新增員工
        </Button>
      </div>

      <DataTable
        data={users as unknown as Record<string, unknown>[]}
        columns={columns as Column<Record<string, unknown>>[]}
        emptyText={isLoading ? '載入中...' : '尚無員工資料'}
      />

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新增員工</DialogTitle></DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-3">
            <UserFormFields form={createForm} managers={managers} departments={departments} showEmployeeId showEmail />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? '建立中...' : '建立並發送歡迎信'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編輯員工 — {editTarget?.full_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-3">
            <UserFormFields form={editForm} managers={managers} departments={departments} showEmail />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>取消</Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending ? '儲存中...' : '儲存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm toggle active */}
      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(o) => !o && setToggleTarget(null)}
        title={toggleTarget?.is_active ? '停用員工' : '啟用員工'}
        description={`確定要${toggleTarget?.is_active ? '停用' : '啟用'} ${toggleTarget?.full_name}？`}
        onConfirm={handleToggle}
      />

      {/* Confirm reset password */}
      <ConfirmDialog
        open={!!resetTarget}
        onOpenChange={(o) => !o && setResetTarget(null)}
        title="重設密碼"
        description={`確定要重設 ${resetTarget?.full_name} 的密碼？系統將產生新的臨時密碼，員工下次登入後必須修改。`}
        onConfirm={handleReset}
      />

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="刪除員工"
        description={`確定要永久刪除 ${deleteTarget?.full_name}（${deleteTarget?.employee_id}）？此操作無法復原，員工的所有登入權限將立即失效。`}
        confirmLabel="確認刪除"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Show new password */}
      <Dialog open={!!newPassword} onOpenChange={(o) => !o && setNewPassword(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>新臨時密碼</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">請將此密碼提供給員工，員工登入後將被要求修改密碼。</p>
          <div className="flex items-center gap-2 rounded-md border bg-slate-50 px-3 py-2">
            <code className="flex-1 text-base font-mono tracking-widest select-all">{newPassword}</code>
            <Button size="sm" variant="ghost" onClick={copyPassword}>
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewPassword(null)}>關閉</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Shared form fields component
function UserFormFields({
  form,
  managers,
  departments,
  showEmployeeId = false,
  showEmail = false,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any
  managers: { id: string; full_name: string; employee_id: string }[]
  departments: { id: string; name: string; is_active: boolean }[]
  showEmployeeId?: boolean
  showEmail?: boolean
}) {
  const { register, control, formState: { errors } } = form
  const activeDepts = departments.filter((d) => d.is_active)

  return (
    <>
      {showEmployeeId && (
        <FormField label="員工編號" error={errors.employee_id} required>
          <Input placeholder="例：EMP001" {...register('employee_id')} />
        </FormField>
      )}
      {showEmail && (
        <FormField label="Email" error={errors.email} required>
          <Input type="email" placeholder="employee@company.com" {...register('email')} />
        </FormField>
      )}
      <FormField label="姓名" error={errors.full_name} required>
        <Input placeholder="請輸入姓名" {...register('full_name')} />
      </FormField>
      <FormField label="角色" error={errors.role} required>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger><SelectValue placeholder="選擇角色" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">員工</SelectItem>
                <SelectItem value="manager">主管</SelectItem>
                <SelectItem value="admin">管理員</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="部門" error={errors.department}>
          <Controller
            name="department"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                value={field.value || '__none__'}
              >
                <SelectTrigger><SelectValue placeholder="選擇部門（可選）" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">無</SelectItem>
                  {activeDepts.map((d) => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField label="職位" error={errors.position}>
          <Input placeholder="例：軟體工程師" {...register('position')} />
        </FormField>
      </div>
      <FormField label="到職日" error={errors.hire_date} required>
        <Input type="date" {...register('hire_date')} />
      </FormField>
      <FormField label="直屬主管" error={errors.manager_id}>
        <Controller
          name="manager_id"
          control={control}
          render={({ field }) => (
            <Select onValueChange={(v) => field.onChange(v === '__none__' ? null : v)} value={field.value ?? '__none__'}>
              <SelectTrigger><SelectValue placeholder="選擇主管（可選）" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">無</SelectItem>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name}（{m.employee_id}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>
    </>
  )
}
