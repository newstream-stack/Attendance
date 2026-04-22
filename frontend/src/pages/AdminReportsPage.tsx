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
  is_comp_morning: boolean
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

interface MonthlyLeave {
  leave_type_id: string
  leave_type: string
  count: number
  mins: number
}

interface MonthlyRow {
  employee_id: string
  full_name: string
  department: string | null
  attend_days: number
  late_count: number
  late_mins: number
  early_count: number
  early_mins: number
  leaves: MonthlyLeave[]
}

interface MonthlySummary {
  leave_types: { id: string; name_zh: string }[]
  rows: MonthlyRow[]
}

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
}
function fmtMins(mins: number | null) {
  if (mins == null || mins === 0) return '—'
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

  const [tab, setTab] = useState<'attendance' | 'leave' | 'monthly'>('attendance')

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
  const [monthlyQuery, setMonthlyQuery] = useState(currentYearMonth())

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

  const { data: monthlyData } = useQuery({
    queryKey: ['report', 'monthly', monthlyQuery],
    queryFn: async () => {
      const [year, month] = monthlyQuery.split('-')
      const { data } = await apiClient.get<MonthlySummary>('/reports/monthly-summary', {
        params: { year, month: String(parseInt(month)) },
      })
      return data
    },
    enabled: tab === 'monthly',
  })

  // ── 下載工具 ──
  function triggerDownload(data: Blob, filename: string) {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const downloadCSV = async () => {
    try {
      let url: string
      let filename: string
      if (tab === 'attendance') {
        const p = new URLSearchParams({ start: attQuery.start, end: attQuery.end, format: 'csv' })
        if (attQuery.user_id) p.set('user_id', attQuery.user_id)
        url = `/reports/attendance?${p}`
        filename = `attendance_${attQuery.start}_${attQuery.end}.csv`
      } else if (tab === 'leave') {
        const p = new URLSearchParams({ start: leaveQuery.start, end: leaveQuery.end, format: 'csv' })
        if (leaveQuery.user_id) p.set('user_id', leaveQuery.user_id)
        if (leaveQuery.leave_type_id) p.set('leave_type_id', leaveQuery.leave_type_id)
        url = `/reports/leave-summary?${p}`
        filename = `leave_${leaveQuery.start}_${leaveQuery.end}.csv`
      } else {
        await downloadMonthlyCSV()
        return
      }
      const response = await apiClient.get(url, { responseType: 'blob' })
      triggerDownload(response.data, filename)
    } catch {
      toast({ variant: 'destructive', title: '匯出失敗' })
    }
  }

  const downloadMonthlyCSV = async () => {
    const [year, month] = monthlyQuery.split('-')
    try {
      const p = new URLSearchParams({ year, month: String(parseInt(month)), format: 'csv' })
      const response = await apiClient.get(`/reports/monthly-summary?${p}`, { responseType: 'blob' })
      triggerDownload(response.data, `monthly_${year}_${month}.csv`)
    } catch {
      toast({ variant: 'destructive', title: '月報下載失敗' })
    }
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
        const comp = r.is_comp_morning
        if (!late && !early && !comp) return <span className="text-slate-400">—</span>
        return (
          <div className="flex flex-col gap-0.5">
            {comp && <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 whitespace-nowrap">補休早上</span>}
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
    { key: 'status', header: '狀態', render: (r) => <StatusBadge status={r.status as never} /> },
  ]

  const monthlyLeaveTypes = monthlyData?.leave_types ?? []
  const monthlyRows = monthlyData?.rows ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">報表</h1>
        <Button variant="outline" onClick={downloadCSV}>
          <Download className="h-4 w-4 mr-1" />
          {tab === 'monthly' ? '匯出月報 CSV' : '匯出 CSV'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto">
        {(['attendance', 'leave', 'monthly'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'attendance' ? '出勤紀錄' : t === 'leave' ? '請假紀錄' : '月報'}
          </button>
        ))}
      </div>

      {tab === 'attendance' && (
        <>
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
      )}

      {tab === 'leave' && (
        <>
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

      {tab === 'monthly' && (
        <>
          {/* 月份選擇 */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500 shrink-0">月份</label>
            <Input
              type="month"
              className="w-36"
              value={monthlyMonth}
              onChange={(e) => setMonthlyMonth(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => setMonthlyQuery(monthlyMonth)}
            >
              查詢
            </Button>
          </div>

          {/* 月報表格 */}
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-left px-3 py-2 whitespace-nowrap font-medium text-slate-600">姓名</th>
                  <th className="text-left px-3 py-2 whitespace-nowrap font-medium text-slate-600">部門</th>
                  <th className="text-right px-3 py-2 whitespace-nowrap font-medium text-slate-600">出勤天數</th>
                  <th className="text-right px-3 py-2 whitespace-nowrap font-medium text-slate-600">遲到次數</th>
                  <th className="text-right px-3 py-2 whitespace-nowrap font-medium text-slate-600">遲到(分鐘)</th>
                  <th className="text-right px-3 py-2 whitespace-nowrap font-medium text-slate-600">早退次數</th>
                  <th className="text-right px-3 py-2 whitespace-nowrap font-medium text-slate-600">早退(分鐘)</th>
                  {monthlyLeaveTypes.map((lt) => (
                    <th key={lt.id} colSpan={2} className="text-center px-3 py-2 whitespace-nowrap font-medium text-slate-600 border-l">
                      {lt.name_zh}
                    </th>
                  ))}
                </tr>
                {monthlyLeaveTypes.length > 0 && (
                  <tr className="bg-slate-50 border-b text-xs text-slate-500">
                    <th colSpan={7} />
                    {monthlyLeaveTypes.map((lt) => (
                      <>
                        <th key={`${lt.id}-count`} className="text-right px-3 py-1 border-l">次數</th>
                        <th key={`${lt.id}-mins`} className="text-right px-3 py-1">分鐘</th>
                      </>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {monthlyRows.length === 0 ? (
                  <tr>
                    <td colSpan={8 + monthlyLeaveTypes.length * 2} className="text-center py-8 text-slate-400">
                      此月份無資料
                    </td>
                  </tr>
                ) : (
                  monthlyRows.map((row) => (
                    <tr key={row.employee_id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-medium">{row.full_name}</td>
                      <td className="px-3 py-2 text-slate-500">{row.department ?? '—'}</td>
                      <td className="px-3 py-2 text-right">{row.attend_days}</td>
                      <td className="px-3 py-2 text-right">
                        {row.late_count > 0 ? <span className="text-red-600">{row.late_count}</span> : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.late_mins > 0 ? <span className="text-red-600">{row.late_mins}</span> : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.early_count > 0 ? <span className="text-amber-600">{row.early_count}</span> : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.early_mins > 0 ? <span className="text-amber-600">{row.early_mins}</span> : '—'}
                      </td>
                      {row.leaves.map((l) => (
                        <>
                          <td key={`${row.employee_id}-${l.leave_type_id}-count`} className="px-3 py-2 text-right border-l">
                            {l.count > 0 ? l.count : '—'}
                          </td>
                          <td key={`${row.employee_id}-${l.leave_type_id}-mins`} className="px-3 py-2 text-right">
                            {l.mins > 0 ? l.mins : '—'}
                          </td>
                        </>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
