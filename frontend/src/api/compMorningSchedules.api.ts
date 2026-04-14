import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface CompMorningSchedule {
  id: string
  user_id: string
  days_of_week: string  // "3,5" = 週三、週五
  note: string | null
  created_at: string
}

export function useCompMorningSchedules(userId: string) {
  return useQuery({
    queryKey: ['comp-morning-schedules', userId],
    queryFn: async () => {
      const { data } = await apiClient.get<CompMorningSchedule[]>('/comp-morning-schedules', { params: { user_id: userId } })
      return data
    },
    enabled: !!userId,
  })
}

export function useAddCompMorningSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { user_id: string; days_of_week: string; note?: string }) => {
      const { data } = await apiClient.post<CompMorningSchedule>('/comp-morning-schedules', payload)
      return data
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['comp-morning-schedules', vars.user_id] }),
  })
}

export function useDeleteCompMorningSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      await apiClient.delete(`/comp-morning-schedules/${id}`)
      return userId
    },
    onSuccess: (userId) => qc.invalidateQueries({ queryKey: ['comp-morning-schedules', userId] }),
  })
}
