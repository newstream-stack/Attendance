import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface SystemSettings {
  id: number
  work_start_time: string
  work_end_time: string
  late_tolerance_mins: number
  hours_per_day: number
  base_bonus_days: number
  updated_at: string
}

export function useSystemSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data } = await apiClient.get<SystemSettings>('/system-settings')
      return data
    },
  })
}

export function useUpdateSystemSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Omit<SystemSettings, 'id' | 'updated_at'>>) => {
      const { data } = await apiClient.put<SystemSettings>('/system-settings', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system-settings'] }),
  })
}
