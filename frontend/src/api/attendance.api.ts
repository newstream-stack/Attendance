import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface AttendanceRecord {
  id: string
  user_id: string
  clock_in: string
  clock_out: string | null
  work_date: string
  duration_mins: number | null
  status: 'active' | 'completed' | 'amended'
  ip_address: string | null
  note: string | null
  is_late: boolean
  late_mins: number | null
  early_leave_mins: number | null
  created_at: string
  updated_at: string
  // joined fields (history/all)
  full_name?: string
  employee_id?: string
}

export function useTodayAttendance() {
  return useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: async () => {
      const { data } = await apiClient.get<AttendanceRecord | null>('/attendance/today')
      return data
    },
    refetchInterval: 60_000, // refresh every minute
  })
}

export function useAttendanceHistory(start: string, end: string) {
  return useQuery({
    queryKey: ['attendance', 'history', start, end],
    queryFn: async () => {
      const { data } = await apiClient.get<AttendanceRecord[]>('/attendance/history', {
        params: { start, end },
      })
      return data
    },
    enabled: !!start && !!end,
  })
}

export function useClockIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<AttendanceRecord>('/attendance/clock-in')
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  })
}

export function useClockOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<AttendanceRecord>('/attendance/clock-out')
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  })
}
