import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useToast } from '@/hooks/use-toast'
import { apiClient } from '@/api/client'
import { useQuery } from '@tanstack/react-query'
import { useLeaveTypes } from '@/api/leave.api'
import { useColleagues } from '@/api/users.api'

interface AttendanceRow {
  employee_id: string
  full_name: string
  department: string | null
  work_date: string
  clock_in: string | null
  clock_out: string | null
  duration_mins: number | null
  status: string
  is_late: boolean
  late_mins: number | null
  early_leave_mins: number | null
}

interface LeaveRow {
  full_name: string
  department: string | null
  leave_type: string
  start_time: string
  end_time: string
  duration_mins: number | null
  status: string
  reason: string | null
}

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
}
function fmtMins(mins: number | null) {
  if (mins == null) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
}

function today() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
}

function currentYearMonth() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function AdminReportsPage() {
  const { toast } = useToast()
  const { data: leaveTypes = [] } = useLeaveTypes()
  const { data: colleagues = [] } = useColleagues()

  // ── 出勤篩選 ──
  const [attStart, setAttStart] = useState(today)
  const [attEnd, setAttEnd] = useState(today)
  const [attUserId, setAttUserId] = useState('all')
  const [attQuery, setAttQuery] = useState({ start: today(), end: today(), user_id: '' })

  // ── 假期篩選 ──
  const [leaveStart, setLeaveStart] = useState(today)
  const [leaveEnd, setLeaveEnd] = useState(today)
  const [leaveUserId, setLeaveUserId] = useState('all')
  const [leaveTypeId, setLeaveTypeId] = useState('all')
  const [leaveQuery, setLeaveQuery] = useState({ start: today(), end: today(), user_id: '', leave_type_id: '' })

  // ── 月報 ──
  const [monthlyMonth, setMonthlyMonth] = useState(currentYearMonth)

  const [tab, setTab] = useState<'attendance' | 'leave'>('attendance')

  // ── Queries ──
  const { data: attendanceData = [] } = useQuery({
    queryKey: ['report', 'attendance', attQuery],
    queryFn: async () => {
      const params: Record<string, string> = { start: attQuery.start, end: attQuery.end }
      if (attQuery.user_id) params.user_id = attQuery.user_id
      const { data } = await apiClient.get<AttendanceRow[]>('/reports/attendance', { params })
      return data
    },
    enabled: tab === 'attendance',
  })

  const { data: leaveData = [] } = useQuery({
    queryKey: ['report', 'leave', leaveQuery],
    queryFn: async () => {
      const params: Record<string, string> = { start: leaveQuery.start, end: leaveQuery.end }
      if (leaveQuery.user_id) params.user_id = leaveQuery.user_id
      if (leaveQuery.leave_type_id) params.leave_type_id = leaveQuery.leave_type_id
      const { data } = await apiClient.get<LeaveRow[]>('/reports/leave-summary', { params })
      return data
    },
    enabled: tab === 'leave',
  })

  // ── CSV 下載 ──
  const downloadCSV = async () => {
    try {
      let url: string
      let filename: string
      if (tab === 'attendance') {
        const p = new URLSearchParams({ start: attQuery.start, end: attQuery.end, format: 'csv' })
        if (attQuery.user_id) p.set('user_id', attQuery.user_id)
        url = `/reports/attendance?${p}`
        filename = `attendance_${attQuery.start}_${attQuery.end}.csv`
      } else {
        const p = new URLSearchParams({ start: leaveQuery.start, end: leaveQuery.end, format: 'csv' })
        if (leaveQuery.user_id) p.set('user_id', leaveQuery.user_id)
        if (leaveQuery.leave_type_id) p.set('leave_type_id', leaveQuery.leave_type_id)
        url = `/reports/leave-summary?${p}`
        filename = `leave_${leaveQuery.start}_${leaveQuery.end}.csv`
      }
      const response = await apiClient.get(url, { responseType: 'blob' })
      triggerDownload(response.data, filename)
    } catch {
      toast({ variant: 'destructive', title: '匯出失敗' })
    }
  }

  const downloadMonthlyCSV = async () => {
    if (!monthlyMonth) return
    const [year, month] = monthlyMonth.split('-')
    try {
      const p = new URLSearchParams({ year, month: String(parseInt(month)) })
      const response = await apiClient.get(`/reports/monthly-summary?${p}`, { responseType: 'blob' })
      triggerDownload(response.data, `monthly_${year}_${month}.csv`)
    } catch {
      toast({ variant: 'destructive', title: '月報下載失敗' })
    }
  }

  function triggerDownload(data: Blob, filename: string) {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // ── 欄位定義 ──
  const attendanceCols: Column<AttendanceRow>[] = [
    { key: 'full_name', header: '姓名', sortable: true },
    { key: 'department', header: '部門', render: (r) => r.department ?? '—' },
    {
      key: 'work_date', header: '日期', sortable: true,
      render: (r) => new Date(r.work_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }),
    },
    { key: 'clock_in', header: '上班', render: (r) => fmtTime(r.clock_in) },
    { key: 'clock_out', header: '下班', render: (r) => fmtTime(r.clock_out) },
    { key: 'duration_mins', header: '工時', render: (r) => fmtMins(r.duration_mins) },
    { key: 'status', header: '狀態', render: (r) => <StatusBadge status={r.status as never} /> },
    {
      key: 'is_late', header: '遲到/早退',
      render: (r) => {
        const late = r.late_mins != null && r.late_mins > 0 ? fmtMins(r.late_mins) : null
        const early = r.early_leave_mins != null && r.early_leave_mins > 0 ? fmtMins(r.early_leave_mins) : null
        if (!late && !early) return <span className="text-slate-400">—</span>
        return (
          <div className="flex flex-col gap-0.5">
            {late && <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 whitespace-nowrap">遲到 {late}</span>}
            {early && <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 whitespace-nowrap">早退 {early}</span>}
          </div>
        )
      },
    },
  ]

  const leaveCols: Column<LeaveRow>[] = [
    { key: 'full_name', header: '姓名', sortable: true },
    { key: 'department', header: '部門', render: (r) => r.department ?? '—' },
    { key: 'leave_type', header: '假別', sortable: true },
    { key: 'start_time', header: '開始', render: (r) => fmtDate(r.start_time) },
    { key: 'end_time', header: '結束', render: (r) => fmtDate(r.end_time) },
    { key: 'duration_mins', header: '時數', render: (r) => fmtMins(r.duration_mins) },
    {
      key: 'status', header: '狀態',
      render: (r) => <StatusBadge status={r.status as never} />,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">報表</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* 月報下載 */}
          <div className="flex items-center gap-1">
            <Input
              type="month"
              className="w-36 h-9"
              value={monthlyMonth}
              onChange={(e) => setMonthlyMonth(e.target.value)}
            />
            <Button variant="outline" onClick={downloadMonthlyCSV}>
              <Download className="h-4 w-4 mr-1" />月報
            </Button>
          </div>
          <Button variant="outline" onClick={downloadCSV}>
            <Download className="h-4 w-4 mr-1" />匯出 CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto">
        {(['attendance', 'leave'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'attendance' ? '出勤紀錄' : '請假紀錄'}
          </button>
        ))}
      </div>

      {tab === 'attendance' ? (
        <>
          {/* 出勤篩選 */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-end">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500 w-10 shrink-0">員工</label>
              <Select value={attUserId} onValueChange={setAttUserId}>
                <SelectTrigger className="flex-1 sm:w-40">
                  <SelectValue placeholder="全部員工" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部員工</SelectItem>
                  {colleagues.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500 w-10 shrink-0">開始</label>
              <Input type="date" className="flex-1 sm:w-36" value={attStart} onChange={(e) => setAttStart(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500 w-10 shrink-0">結束</label>
              <Input type="date" className="flex-1 sm:w-36" value={attEnd} onChange={(e) => setAttEnd(e.target.value)} />
            </div>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setAttQuery({ start: attStart, end: attEnd, user_id: attUserId === 'all' ? '' : attUserId })}
            >
              查詢
            </Button>
          </div>
          <DataTable
            data={attendanceData as unknown as Record<string, unknown>[]}
            columns={attendanceCols as Column<Record<string, unknown>>[]}
            emptyText="此區間無打卡紀錄"
            pageSize={20}
          />
        </>
      ) : (
        <>
          {/* 假期篩選 */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-end">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500 w-10 shrink-0">員工</label>
              <Select value={leaveUserId} onValueChange={setLeaveUserId}>
                <SelectTrigger className="flex-1 sm:w-40">
                  <SelectValue placeholder="全部員工" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部員工</SelectItem>
                  {colleagues.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500 w-10 shrink-0">開始</label>
              <Input type="date" className="flex-1 sm:w-36" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500 w-10 shrink-0">結束</label>
              <Input type="date" className="flex-1 sm:w-36" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500 w-10 shrink-0">假別</label>
              <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
                <SelectTrigger className="flex-1 sm:w-36">
                  <SelectValue placeholder="全部假別" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部假別</SelectItem>
                  {leaveTypes.map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>{lt.name_zh}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setLeaveQuery({
                start: leaveStart,
                end: leaveEnd,
                user_id: leaveUserId === 'all' ? '' : leaveUserId,
                leave_type_id: leaveTypeId === 'all' ? '' : leaveTypeId,
              })}
            >
              查詢
            </Button>
          </div>
          <DataTable
            data={leaveData as unknown as Record<string, unknown>[]}
            columns={leaveCols as Column<Record<string, unknown>>[]}
            emptyText="此區間無請假紀錄"
            pageSize={20}
          />
        </>
      )}
    </div>
  )
}
