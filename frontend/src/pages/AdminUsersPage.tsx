import { useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, UserCheck, UserX, KeyRound, Copy, Check, Trash2, Mail, CalendarDays } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useDispatchDates, useAddDispatchDate, useBulkAddDispatchDates, useDeleteDispatchDate } from '@/api/dispatchDates.api'
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
  useAdminResetPassword, useDeleteUser, useSendResetEmail,
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
  track_attendance: z.boolean(),
  is_special_dispatch: z.boolean(),
})

const editSchema = createSchema

type CreateForm = z.infer<typeof createSchema>
type EditForm = CreateForm

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
  const sendResetEmail = useSendResetEmail()

  // 排序：admin 第一，其次依部門（無部門排最後），再依員工編號
  const sortedUsers = useMemo(() => [...users].sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1
    if (b.role === 'admin' && a.role !== 'admin') return 1
    const da = a.department ?? '\uffff'
    const db_ = b.department ?? '\uffff'
    if (da !== db_) return da.localeCompare(db_, 'zh-TW')
    return (a.employee_id ?? '').localeCompare(b.employee_id ?? '')
  }), [users])

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<UserRow | null>(null)
  const [toggleTarget, setToggleTarget] = useState<UserRow | null>(null)
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [sendEmailTarget, setSendEmailTarget] = useState<UserRow | null>(null)
  const [dispatchTarget, setDispatchTarget] = useState<UserRow | null>(null)

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'employee', manager_id: null, track_attendance: true, is_special_dispatch: false },
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
      employee_id: user.employee_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      department: user.department ?? '',
      position: user.position ?? '',
      hire_date: user.hire_date.slice(0, 10),
      manager_id: user.manager_id,
      track_attendance: user.track_attendance,
      is_special_dispatch: user.is_special_dispatch,
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
      key: 'track_attendance', header: '出勤規範',
      render: (row) => {
        const u = row as unknown as UserRow
        return (
          <div className="flex flex-wrap gap-1">
            {u.is_special_dispatch && <Badge variant="outline" className="text-blue-600 border-blue-300">特約</Badge>}
            {!u.track_attendance && <Badge variant="secondary">不計遲退</Badge>}
            {u.track_attendance && !u.is_special_dispatch && <Badge variant="outline">一般</Badge>}
          </div>
        )
      },
    },
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
          {(row as unknown as UserRow).is_special_dispatch && (
            <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700" onClick={() => setDispatchTarget(row as unknown as UserRow)} title="管理出勤日">
              <CalendarDays className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSendEmailTarget(row)} title="傳送密碼重設信">
            <Mail className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setResetTarget(row)} title="直接重設密碼">
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">員工管理</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> 新增員工
        </Button>
      </div>

      <DataTable
        data={sortedUsers as unknown as Record<string, unknown>[]}
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
            <UserFormFields form={editForm} managers={managers} departments={departments} showEmployeeId showEmail />
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

      {/* Confirm send reset email */}
      <ConfirmDialog
        open={!!sendEmailTarget}
        onOpenChange={(o) => !o && setSendEmailTarget(null)}
        title="傳送密碼重設信"
        description={`確定要傳送密碼重設連結至 ${sendEmailTarget?.email}？連結有效期限為 1 小時。`}
        confirmLabel="傳送"
        onConfirm={() => {
          if (!sendEmailTarget) return
          sendResetEmail.mutate(sendEmailTarget.id, {
            onSuccess: () => { toast({ title: '密碼重設信已寄出' }); setSendEmailTarget(null) },
            onError: () => { toast({ variant: 'destructive', title: '傳送失敗' }); setSendEmailTarget(null) },
          })
        }}
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

      {/* Dispatch dates management */}
      {dispatchTarget && (
        <DispatchDatesDialog
          user={dispatchTarget}
          onClose={() => setDispatchTarget(null)}
        />
      )}

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      <div className="flex flex-col gap-2">
        <Controller
          name="track_attendance"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Checkbox
                id="track_attendance"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <Label htmlFor="track_attendance" className="text-sm font-normal cursor-pointer">
                計算遲到 / 早退
                <span className="ml-1 text-slate-400">
                  {field.value ? '（啟用）' : '（停用 — 僅記錄打卡時間）'}
                </span>
              </Label>
            </div>
          )}
        />
        <Controller
          name="is_special_dispatch"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Checkbox
                id="is_special_dispatch"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <Label htmlFor="is_special_dispatch" className="text-sm font-normal cursor-pointer">
                特約人員
                <span className="ml-1 text-slate-400">（僅排定出勤日才計入出勤）</span>
              </Label>
            </div>
          )}
        />
      </div>
    </>
  )
}

const DOW_LABELS = ['日', '一', '二', '三', '四', '五', '六']

function generateDatesForDow(dowList: number[], from: string, to: string): string[] {
  const result: string[] = []
  const cur = new Date(from + 'T12:00:00Z')
  const last = new Date(to + 'T12:00:00Z')
  while (cur <= last) {
    if (dowList.includes(cur.getUTCDay())) {
      const y = cur.getUTCFullYear()
      const mo = String(cur.getUTCMonth() + 1).padStart(2, '0')
      const d = String(cur.getUTCDate()).padStart(2, '0')
      result.push(`${y}-${mo}-${d}`)
    }
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return result
}

function DispatchDatesDialog({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const { toast } = useToast()
  const { data: dates = [], isLoading } = useDispatchDates(user.id)
  const addDate = useAddDispatchDate()
  const bulkAdd = useBulkAddDispatchDates()
  const deleteDate = useDeleteDispatchDate()

  // 單筆新增
  const [singleDate, setSingleDate] = useState('')
  const [singleIn, setSingleIn] = useState('')
  const [singleOut, setSingleOut] = useState('')

  // 批次新增（每週幾）
  const [recurDows, setRecurDows] = useState<number[]>([])
  const [recurFrom, setRecurFrom] = useState('')
  const [recurTo, setRecurTo] = useState('')
  const [recurIn, setRecurIn] = useState('')
  const [recurOut, setRecurOut] = useState('')

  const toggleDow = (d: number) =>
    setRecurDows(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  const handleAddSingle = async () => {
    if (!singleDate) return
    try {
      await addDate.mutateAsync({
        user_id: user.id, work_date: singleDate,
        clock_in_time: singleIn || undefined,
        clock_out_time: singleOut || undefined,
      })
      setSingleDate('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      toast({ variant: 'destructive', title: '新增失敗', description: msg ?? '日期可能已存在' })
    }
  }

  const handleBulkAdd = async () => {
    if (recurDows.length === 0 || !recurFrom || !recurTo) return
    const generated = generateDatesForDow(recurDows, recurFrom, recurTo)
    if (generated.length === 0) {
      toast({ variant: 'destructive', title: '無符合日期', description: '指定範圍內找不到選取的星期' })
      return
    }
    try {
      const { inserted } = await bulkAdd.mutateAsync({
        user_id: user.id, dates: generated,
        clock_in_time: recurIn || undefined,
        clock_out_time: recurOut || undefined,
      })
      toast({ title: `已新增 ${inserted} 筆出勤日` })
      setRecurDows([]); setRecurFrom(''); setRecurTo(''); setRecurIn(''); setRecurOut('')
    } catch {
      toast({ variant: 'destructive', title: '批次新增失敗' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDate.mutateAsync({ id, userId: user.id })
    } catch {
      toast({ variant: 'destructive', title: '刪除失敗' })
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>特約出勤日 — {user.full_name}</DialogTitle>
        </DialogHeader>

        {/* 單筆新增 */}
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">單筆新增</p>
          <div className="flex gap-2">
            <Input type="date" value={singleDate} onChange={e => setSingleDate(e.target.value)} className="flex-1" />
            <Input type="time" value={singleIn} onChange={e => setSingleIn(e.target.value)} className="w-28" placeholder="上班" title="上班時間" />
            <Input type="time" value={singleOut} onChange={e => setSingleOut(e.target.value)} className="w-28" placeholder="下班" title="下班時間" />
            <Button onClick={handleAddSingle} disabled={!singleDate || addDate.isPending}>新增</Button>
          </div>
        </div>

        {/* 批次新增（每週幾） */}
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">批次新增（每週幾）</p>
          <div className="flex gap-1">
            {DOW_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDow(i)}
                className={`w-8 h-8 rounded text-sm border transition-colors ${
                  recurDows.includes(i)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-slate-500">開始日期</Label>
              <Input type="date" value={recurFrom} onChange={e => setRecurFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">結束日期</Label>
              <Input type="date" value={recurTo} onChange={e => setRecurTo(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">上班時間</Label>
              <Input type="time" value={recurIn} onChange={e => setRecurIn(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-500">下班時間</Label>
              <Input type="time" value={recurOut} onChange={e => setRecurOut(e.target.value)} />
            </div>
          </div>
          <Button
            className="w-full"
            onClick={handleBulkAdd}
            disabled={recurDows.length === 0 || !recurFrom || !recurTo || bulkAdd.isPending}
          >
            {bulkAdd.isPending ? '新增中...' : `批次新增`}
          </Button>
        </div>

        {/* 已排定清單 */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">已排定（共 {dates.length} 筆）</p>
          {isLoading && <p className="text-sm text-slate-400">載入中...</p>}
          {!isLoading && dates.length === 0 && <p className="text-sm text-slate-400">尚無排定出勤日</p>}
          {dates.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
              <span className="font-mono">{d.work_date.substring(0, 10)}</span>
              <span className="text-slate-500 text-xs">
                {d.clock_in_time ?? '--:--'} — {d.clock_out_time ?? '--:--'}
              </span>
              <Button
                size="sm" variant="ghost"
                className="text-red-500 hover:text-red-600 h-6 w-6 p-0"
                onClick={() => handleDelete(d.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>關閉</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
