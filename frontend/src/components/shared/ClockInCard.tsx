import { useState, useEffect } from 'react'
import { Clock, LogIn, LogOut } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useTodayAttendance, useClockIn, useClockOut } from '@/api/attendance.api'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('zh-TW', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function ClockInCard() {
  const { toast } = useToast()
  const { data: record, isLoading } = useTodayAttendance()
  const clockIn = useClockIn()
  const clockOut = useClockOut()
  const now = useClock()

  const handleClockIn = async () => {
    try {
      await clockIn.mutateAsync()
      toast({ title: '上班打卡成功' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? '打卡失敗'
      toast({ variant: 'destructive', title: '打卡失敗', description: msg })
    }
  }

  const handleClockOut = async () => {
    try {
      await clockOut.mutateAsync()
      toast({ title: '下班打卡成功' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? '打卡失敗'
      toast({ variant: 'destructive', title: '打卡失敗', description: msg })
    }
  }

  const isBusy = clockIn.isPending || clockOut.isPending

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          今日打卡狀態
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Live clock */}
        <p className="text-3xl font-bold tabular-nums text-slate-900">
          {now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {now.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
        </p>

        {isLoading ? (
          <p className="text-sm text-slate-400 mt-3">載入中...</p>
        ) : (
          <div className="mt-3 space-y-2">
            {record ? (
              <>
                <div className="flex gap-4 text-sm">
                  <span className="text-slate-500">上班：<strong>{formatTime(record.clock_in)}</strong></span>
                  {record.clock_out && (
                    <span className="text-slate-500">下班：<strong>{formatTime(record.clock_out)}</strong></span>
                  )}
                </div>
                {record.duration_mins != null && (
                  <p className="text-xs text-slate-400">
                    工時 {Math.floor(record.duration_mins / 60)}h {record.duration_mins % 60}m
                  </p>
                )}
                {record.status === 'active' && (
                  <Button size="sm" variant="outline" onClick={handleClockOut} disabled={isBusy} className="w-full mt-2">
                    <LogOut className="h-4 w-4 mr-1" />
                    {clockOut.isPending ? '打卡中...' : '下班打卡'}
                  </Button>
                )}
                {record.status === 'completed' && (
                  <p className="text-xs text-green-600 font-medium">今日已完成打卡</p>
                )}
              </>
            ) : (
              <Button size="sm" onClick={handleClockIn} disabled={isBusy} className="w-full">
                <LogIn className="h-4 w-4 mr-1" />
                {clockIn.isPending ? '打卡中...' : '上班打卡'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
