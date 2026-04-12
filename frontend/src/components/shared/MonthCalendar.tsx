import { PublicHoliday } from '@/api/publicHoliday.api'

interface MonthCalendarProps {
  year: number
  month: number // 1-12
  holidays: PublicHoliday[]
  onDayClick?: (date: string, holiday: PublicHoliday | undefined) => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

/** 處理 PostgreSQL DATE 欄位可能回傳 ISO 時間戳的情況，統一轉為 YYYY-MM-DD */
function toDateKey(raw: string): string {
  if (!raw) return ''
  if (raw.length === 10) return raw
  return new Date(raw).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
}

export function MonthCalendar({ year, month, holidays, onDayClick }: MonthCalendarProps) {
  const holidayMap = new Map<string, PublicHoliday>()
  for (const h of holidays) {
    holidayMap.set(toDateKey(h.holiday_date), h)
  }

  const firstDay = new Date(year, month - 1, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* 月份標題 */}
      <div className="bg-slate-50 px-3 py-2 text-center text-sm font-semibold text-slate-700 border-b border-slate-200">
        {MONTH_NAMES[month - 1]}
      </div>

      {/* 星期標頭 */}
      <div className="grid grid-cols-7 text-center border-b border-slate-100">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`py-1 text-xs font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-400'}`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 日期格子 */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`e-${idx}`} className="min-h-[44px] sm:min-h-[48px]" />
          }
          const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const holiday = holidayMap.get(isoDate)
          const dow = (firstDay + day - 1) % 7
          const isSun = dow === 0
          const isSat = dow === 6
          const isHoliday = !!holiday

          return (
            <div
              key={day}
              onClick={() => onDayClick?.(isoDate, holiday)}
              title={holiday?.name}
              className={[
                'flex flex-col items-center justify-start pt-1 pb-0.5 min-h-[44px] sm:min-h-[48px] select-none',
                onDayClick ? 'cursor-pointer active:opacity-70' : '',
                isHoliday
                  ? 'bg-red-50 hover:bg-red-100'
                  : onDayClick
                  ? 'hover:bg-slate-50'
                  : '',
              ].join(' ')}
            >
              <span
                className={[
                  'w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium leading-none',
                  isHoliday
                    ? 'bg-red-500 text-white'
                    : isSun
                    ? 'text-red-500'
                    : isSat
                    ? 'text-blue-500'
                    : 'text-slate-700',
                ].join(' ')}
              >
                {day}
              </span>
              {holiday && (
                <span
                  className="text-red-600 mt-0.5 w-full px-0.5 text-center break-all"
                  style={{ fontSize: '9px', lineHeight: 1.2 }}
                >
                  {holiday.name}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
