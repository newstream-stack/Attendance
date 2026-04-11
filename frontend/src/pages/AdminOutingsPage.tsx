import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, Column } from '@/components/shared/DataTable'
import { useTodayOutings, useSearchOutings, OutingRecord } from '@/api/outing.api'
import { useColleagues } from '@/api/users.api'

const columns: Column<OutingRecord>[] = [
  { key: 'employee_id', header: '員工編號', sortable: true },
  { key: 'full_name', header: '姓名', sortable: true },
  {
    key: 'outing_date', header: '外出日期', sortable: true,
    render: (r) => new Date(r.outing_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }),
  },
  { key: 'destination', header: '外出地點' },
  { key: 'leave_type_name', header: '假別', render: (r) => r.leave_type_name ?? '—' },
  { key: 'note', header: '備註', render: (r) => r.note ?? '—' },
]

export default function AdminOutingsPage() {
  const [tab, setTab] = useState<'today' | 'search'>('today')
  const [selectedUserId, setSelectedUserId] = useState('all')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [query, setQuery] = useState<{ user_id?: string; start?: string; end?: string }>({})

  const { data: todayData = [], isLoading: todayLoading } = useTodayOutings()
  const { data: colleagues = [] } = useColleagues()
  const { data: searchData = [], isLoading: searchLoading } = useSearchOutings(query, tab === 'search')

  const handleSearch = () => {
    setQuery({
      user_id: selectedUserId === 'all' ? undefined : selectedUserId,
      start: start || undefined,
      end: end || undefined,
    })
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">外出記錄</h1>

      {/* Tabs */}
      <div className="flex border-b">
        {(['today', 'search'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'today' ? `今日外出（${today}）` : '查詢'}
          </button>
        ))}
      </div>

      {tab === 'today' ? (
        <DataTable
          data={todayData as unknown as Record<string, unknown>[]}
          columns={columns as Column<Record<string, unknown>>[]}
          emptyText={todayLoading ? '載入中…' : '今日無外出記錄'}
          pageSize={20}
        />
      ) : (
        <div className="space-y-4">
          {/* Search filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500 whitespace-nowrap">員工</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="選擇員工" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部員工</SelectItem>
                  {colleagues.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}（{c.employee_id}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500">開始日期</label>
              <Input
                type="date"
                className="w-36"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500">結束日期</label>
              <Input
                type="date"
                className="w-36"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={handleSearch}>查詢</Button>
          </div>

          <DataTable
            data={searchData as unknown as Record<string, unknown>[]}
            columns={columns as Column<Record<string, unknown>>[]}
            emptyText={searchLoading ? '載入中…' : '無符合條件的外出記錄'}
            pageSize={20}
          />
        </div>
      )}
    </div>
  )
}
