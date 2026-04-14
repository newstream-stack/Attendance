import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface DispatchDate {
  id: string
  user_id: string
  work_date: string
  clock_in_time: string | null   // HH:MM
  clock_out_time: string | null  // HH:MM
  note: string | null
  created_at: string
}

export function useDispatchDates(userId: string, year?: number, month?: number) {
  return useQuery({
    queryKey: ['dispatch-dates', userId, year, month],
    queryFn: async () => {
      const params: Record<string, string> = { user_id: userId }
      if (year) params.year = String(year)
      if (month) params.month = String(month)
      const { data } = await apiClient.get<DispatchDate[]>('/dispatch-dates', { params })
      return data
    },
    enabled: !!userId,
  })
}

export function useAddDispatchDate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      user_id: string; work_date: string
      clock_in_time?: string; clock_out_time?: string; note?: string
    }) => {
      const { data } = await apiClient.post<DispatchDate>('/dispatch-dates', payload)
      return data
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['dispatch-dates', vars.user_id] }),
  })
}

export function useBulkAddDispatchDates() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      user_id: string; dates: string[]
      clock_in_time?: string; clock_out_time?: string; note?: string
    }) => {
      const { data } = await apiClient.post<{ inserted: number }>('/dispatch-dates/bulk', payload)
      return data
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['dispatch-dates', vars.user_id] }),
  })
}

export function useDeleteDispatchDate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      await apiClient.delete(`/dispatch-dates/${id}`)
      return userId
    },
    onSuccess: (userId) => qc.invalidateQueries({ queryKey: ['dispatch-dates', userId] }),
  })
}
