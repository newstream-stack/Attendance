import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable, Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useToast } from '@/hooks/use-toast'
import { apiClient } from '@/api/client'
import { useQuery } from '@tanstack/react-query'

interface AttendanceRow {
  employee_id: string
  full_name: string
  department: string | null
  work_date: string
  clock_in: string | null
  clock_out: string | null
  duration_mins: number | null
  status: string
}

interface LeaveSummaryRow {
  employee_id: string
  full_name: string
  department: string | null
  leave_type: string
  allocated_mins: number
  used_mins: number
  carried_mins: number
  adjusted_mins: number
}

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
}
function fmtMins(mins: number | null) {
  if (mins == null) return '—'
  return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`
}

function defaultRange() {
  const end = new Date()
  const start = new Date(end.getFullYear(), end.getMonth(), 1)
  return {
    start: start.toLocaleDateString('en-CA'),
    end: end.toLocaleDateString('en-CA'),
  }
}

export default function AdminReportsPage() {
  const { toast } = useToast()
  const def = defaultRange()
  const [tab, setTab] = useState<'attendance' | 'leave'>('attendance')
  const [start, setStart] = useState(def.start)
  const [end, setEnd] = useState(def.end)
  const [year, setYear] = useState(new Date().getFullYear())
  const [query, setQuery] = useState({ start: def.start, end: def.end, year: new Date().getFullYear() })

  const { data: attendanceData = [] } = useQuery({
    queryKey: ['report', 'attendance', query.start, query.end],
    queryFn: async () => {
      const { data } = await apiClient.get<AttendanceRow[]>('/reports/attendance', {
        params: { start: query.start, end: query.end },
      })
      return data
    },
    enabled: tab === 'attendance',
  })

  const { data: leaveData = [] } = useQuery({
    queryKey: ['report', 'leave', query.year],
    queryFn: async () => {
      const { data } = await apiClient.get<LeaveSummaryRow[]>('/reports/leave-summary', {
        params: { year: query.year },
      })
      return data
    },
    enabled: tab === 'leave',
  })

  const downloadCSV = async () => {
    try {
      const url = tab === 'attendance'
        ? `/reports/attendance?start=${query.start}&end=${query.end}&format=csv`
        : `/reports/leave-summary?year=${query.year}&format=csv`

      const response = await apiClient.get(url, { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = tab === 'attendance'
        ? `attendance_${query.start}_${query.end}.csv`
        : `leave_summary_${query.year}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch {
      toast({ variant: 'destructive', title: '匯出失敗' })
    }
  }

  const attendanceCols: Column<AttendanceRow>[] = [
    { key: 'employee_id', header: '員工編號', sortable: true },
    { key: 'full_name', header: '姓名', sortable: true },
    { key: 'department', header: '部門', render: (r) => r.department ?? '—' },
    { key: 'work_date', header: '日期', sortable: true },
    { key: 'clock_in', header: '上班', render: (r) => fmtTime(r.clock_in) },
    { key: 'clock_out', header: '下班', render: (r) => fmtTime(r.clock_out) },
    { key: 'duration_mins', header: '工時', render: (r) => fmtMins(r.duration_mins) },
    { key: 'status', header: '狀態', render: (r) => <StatusBadge status={r.status as never} /> },
  ]

  const leaveCols: Column<LeaveSummaryRow>[] = [
    { key: 'employee_id', header: '員工編號', sortable: true },
    { key: 'full_name', header: '姓名', sortable: true },
    { key: 'department', header: '部門', render: (r) => r.department ?? '—' },
    { key: 'leave_type', header: '假別' },
    { key: 'allocated_mins', header: '配發', render: (r) => fmtMins(r.allocated_mins) },
    { key: 'used_mins', header: '已用', render: (r) => fmtMins(r.used_mins) },
    {
      key: 'remaining', header: '餘額',
      render: (r) => fmtMins(r.allocated_mins + r.carried_mins + r.adjusted_mins - r.used_mins),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">報表</h1>
        <Button variant="outline" onClick={downloadCSV}>
          <Download className="h-4 w-4 mr-1" />匯出 CSV
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {(['attendance', 'leave'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'attendance' ? '出勤紀錄' : '假期摘要'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        {tab === 'attendance' ? (
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500">開始</label>
              <Input type="date" className="w-36" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500">結束</label>
              <Input type="date" className="w-36" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <Button variant="outline" onClick={() => setQuery((q) => ({ ...q, start, end }))}>查詢</Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500">年度</label>
              <Input type="number" className="w-24" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
            <Button variant="outline" onClick={() => setQuery((q) => ({ ...q, year }))}>查詢</Button>
          </>
        )}
      </div>

      {tab === 'attendance' ? (
        <DataTable
          data={attendanceData as unknown as Record<string, unknown>[]}
          columns={attendanceCols as Column<Record<string, unknown>>[]}
          emptyText="此區間無打卡紀錄"
          pageSize={20}
        />
      ) : (
        <DataTable
          data={leaveData as unknown as Record<string, unknown>[]}
          columns={leaveCols as Column<Record<string, unknown>>[]}
          emptyText="此年度無假期資料"
          pageSize={20}
        />
      )}
    </div>
  )
}
