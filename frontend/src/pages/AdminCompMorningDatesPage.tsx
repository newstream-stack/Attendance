import { useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { FormField } from '@/components/shared/FormField'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { useUsers } from '@/api/users.api'
import {
  useCompMorningDates,
  useAddCompMorningDate,
  useBulkAddCompMorningDates,
  useDeleteCompMorningDate,
  CompMorningDate,
} from '@/api/compMorningDates.api'

export default function AdminCompMorningDatesPage() {
  const { toast } = useToast()
  const currentYear = new Date().getFullYear()

  const [selectedUserId, setSelectedUserId] = useState('')
  const [year, setYear] = useState(currentYear)

  const [createOpen, setCreateOpen] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newNote, setNewNote] = useState('')

  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkDates, setBulkDates] = useState('')
  const [bulkNote, setBulkNote] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<CompMorningDate | null>(null)

  const { data: users = [] } = useUsers()
  const activeUsers = users.filter(u => u.is_active)

  const { data: dates = [], isLoading } = useCompMorningDates(
    selectedUserId,
    year,
    undefined,
  )

  const addDate = useAddCompMorningDate()
  const bulkAdd = useBulkAddCompMorningDates()
  const deleteDate = useDeleteCompMorningDate()

  const selectedUser = activeUsers.find(u => u.id === selectedUserId)

  const handleAdd = () => {
    if (!newDate) return
    addDate.mutate(
      { user_id: selectedUserId, work_date: newDate, note: newNote || undefined },
      {
        onSuccess: () => {
          toast({ title: '已新增補休早上日期' })
          setCreateOpen(false)
          setNewDate('')
          setNewNote('')
        },
        onError: (err: any) => {
          toast({ title: err?.response?.data?.message ?? '新增失敗', variant: 'destructive' })
        },
      },
    )
  }

  const handleBulkAdd = () => {
    const parsed = bulkDates
      .split(/[\n,，、\s]+/)
      .map(s => s.trim())
      .filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s))
    if (parsed.length === 0) {
      toast({ title: '請輸入有效日期（格式：YYYY-MM-DD）', variant: 'destructive' })
      return
    }
    bulkAdd.mutate(
      { user_id: selectedUserId, dates: parsed, note: bulkNote || undefined },
      {
        onSuccess: ({ inserted }) => {
          toast({ title: `已新增 ${inserted} 筆補休早上日期` })
          setBulkOpen(false)
          setBulkDates('')
          setBulkNote('')
        },
        onError: (err: any) => {
          toast({ title: err?.response?.data?.message ?? '批次新增失敗', variant: 'destructive' })
        },
      },
    )
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteDate.mutate(
      { id: deleteTarget.id, userId: selectedUserId },
      {
        onSuccess: () => {
          toast({ title: '已刪除' })
          setDeleteTarget(null)
        },
        onError: () => toast({ title: '刪除失敗', variant: 'destructive' }),
      },
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">補休早上管理</h1>
        <p className="text-sm text-slate-500">指定人員在特定日期上午不算上班，從 13:30 開始計算出勤</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">選擇員工</label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="請選擇員工" />
            </SelectTrigger>
            <SelectContent>
              {activeUsers.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name}（{u.employee_id}）
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">年份</label>
          <Input
            type="number"
            className="w-28"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            min={2020}
            max={2100}
          />
        </div>

        {selectedUserId && (
          <>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />新增日期
            </Button>
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />批次新增
            </Button>
          </>
        )}
      </div>

      {/* Table */}
      {!selectedUserId ? (
        <p className="text-slate-400 text-sm">請先選擇員工</p>
      ) : isLoading ? (
        <p className="text-slate-400 text-sm">載入中…</p>
      ) : dates.length === 0 ? (
        <p className="text-slate-400 text-sm">{year} 年無補休早上日期</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">日期</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">備註</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {dates.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono">{d.work_date}</td>
                  <td className="px-4 py-3 text-slate-500">{d.note ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteTarget(d)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Single add dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              新增補休早上日期
              {selectedUser && <span className="font-normal text-slate-500 ml-1">— {selectedUser.full_name}</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="日期">
              <Input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
              />
            </FormField>
            <FormField label="備註（選填）">
              <Input
                placeholder="例如：4/13 加班補休"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                maxLength={200}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleAdd} disabled={!newDate || addDate.isPending}>新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk add dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              批次新增補休早上
              {selectedUser && <span className="font-normal text-slate-500 ml-1">— {selectedUser.full_name}</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="日期清單" error={undefined}>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm resize-none h-32 focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder={'每行或以逗號分隔，格式 YYYY-MM-DD\n例：\n2026-04-14\n2026-04-21'}
                value={bulkDates}
                onChange={e => setBulkDates(e.target.value)}
              />
            </FormField>
            <FormField label="備註（選填）">
              <Input
                placeholder="套用到所有日期"
                value={bulkNote}
                onChange={e => setBulkNote(e.target.value)}
                maxLength={200}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>取消</Button>
            <Button onClick={handleBulkAdd} disabled={bulkAdd.isPending}>批次新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => { if (!o) setDeleteTarget(null) }}
        title="確認刪除"
        description={`確定要刪除 ${deleteTarget?.work_date} 的補休早上記錄？`}
        confirmLabel="刪除"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
