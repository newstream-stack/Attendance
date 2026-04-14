import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface CompMorningDate {
  id: string
  user_id: string
  work_date: string
  note: string | null
  created_at: string
}

export function useCompMorningDates(userId: string, year?: number, month?: number) {
  return useQuery({
    queryKey: ['comp-morning-dates', userId, year, month],
    queryFn: async () => {
      const params: Record<string, string> = { user_id: userId }
      if (year) params.year = String(year)
      if (month) params.month = String(month)
      const { data } = await apiClient.get<CompMorningDate[]>('/comp-morning-dates', { params })
      return data
    },
    enabled: !!userId,
  })
}

export function useAddCompMorningDate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { user_id: string; work_date: string; note?: string }) => {
      const { data } = await apiClient.post<CompMorningDate>('/comp-morning-dates', payload)
      return data
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['comp-morning-dates', vars.user_id] }),
  })
}

export function useBulkAddCompMorningDates() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { user_id: string; dates: string[]; note?: string }) => {
      const { data } = await apiClient.post<{ inserted: number }>('/comp-morning-dates/bulk', payload)
      return data
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['comp-morning-dates', vars.user_id] }),
  })
}

export function useDeleteCompMorningDate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      await apiClient.delete(`/comp-morning-dates/${id}`)
      return userId
    },
    onSuccess: (userId) => qc.invalidateQueries({ queryKey: ['comp-morning-dates', userId] }),
  })
}
