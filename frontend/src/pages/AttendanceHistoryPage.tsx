import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable, Column } from '@/components/shared/DataTable'
import { useAttendanceHistory, AttendanceRecord } from '@/api/attendance.api'

function toLocalDate(iso: string) {
  return new Date(iso).toLocaleTimeString('zh-TW', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function formatDuration(mins: number | null) {
  if (mins == null) return '—'
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function defaultRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 29)
  const fmt = (d: Date) => d.toLocaleDateString('en-CA')
  return { start: fmt(start), end: fmt(end) }
}

export default function AttendanceHistoryPage() {
  const def = defaultRange()
  const [start, setStart] = useState(def.start)
  const [end, setEnd] = useState(def.end)
  const [query, setQuery] = useState(def)

  const { data: records = [], isLoading } = useAttendanceHistory(query.start, query.end)

  const columns: Column<AttendanceRecord>[] = [
    { key: 'work_date', header: '日期', sortable: true, render: (r) => new Date(r.work_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }) },
    {
      key: 'clock_in', header: '上班',
      render: (r) => toLocalDate(r.clock_in),
    },
    {
      key: 'clock_out', header: '下班',
      render: (r) => r.clock_out ? toLocalDate(r.clock_out) : '—',
    },
    {
      key: 'duration_mins', header: '工時',
      render: (r) => formatDuration(r.duration_mins),
    },
    {
      key: 'status', header: '狀態',
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'ip_address', header: 'IP',
      render: (r) => <span className="text-xs text-slate-400">{r.ip_address ?? '—'}</span>,
    },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">打卡記錄</h1>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">開始</label>
          <Input type="date" className="w-36" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">結束</label>
          <Input type="date" className="w-36" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => setQuery({ start, end })}>查詢</Button>
      </div>

      <DataTable
        data={records as unknown as Record<string, unknown>[]}
        columns={columns as Column<Record<string, unknown>>[]}
        emptyText={isLoading ? '載入中...' : '此區間無打卡紀錄'}
      />
    </div>
  )
}
