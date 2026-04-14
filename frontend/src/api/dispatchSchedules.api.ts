import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface DispatchSchedule {
  id: string
  user_id: string
  days_of_week: string  // "1,4"
  clock_in_time: string
  clock_out_time: string
  note: string | null
  created_at: string
}

export const DOW_LABELS = ['日', '一', '二', '三', '四', '五', '六']

export function parseDow(s: string): number[] {
  return s.split(',').map(Number)
}

export function formatDow(days: number[]): string {
  return [...days].sort().join(',')
}

export function useDispatchSchedules(userId: string) {
  return useQuery({
    queryKey: ['dispatch-schedules', userId],
    queryFn: async () => {
      const { data } = await apiClient.get<DispatchSchedule[]>('/dispatch-schedules', { params: { user_id: userId } })
      return data
    },
    enabled: !!userId,
  })
}

export function useAddDispatchSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      user_id: string; days_of_week: string
      clock_in_time: string; clock_out_time: string; note?: string
    }) => {
      const { data } = await apiClient.post<DispatchSchedule>('/dispatch-schedules', payload)
      return data
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['dispatch-schedules', vars.user_id] }),
  })
}

export function useDeleteDispatchSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      await apiClient.delete(`/dispatch-schedules/${id}`)
      return userId
    },
    onSuccess: (userId) => qc.invalidateQueries({ queryKey: ['dispatch-schedules', userId] }),
  })
}

export function useApplyDispatchSchedules() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { user_id: string; from_date: string; to_date: string }) => {
      const { data } = await apiClient.post<{ inserted: number; total: number }>('/dispatch-schedules/apply', payload)
      return data
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['dispatch-dates', vars.user_id] }),
  })
}
