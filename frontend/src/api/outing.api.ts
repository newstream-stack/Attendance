import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface OutingRecord {
  id: string
  user_id: string
  outing_date: string
  destination: string
  leave_type_id: string | null
  note: string | null
  created_at: string
  // Joined
  full_name?: string
  employee_id?: string
  leave_type_name?: string | null
}

export function useMyOutings() {
  return useQuery({
    queryKey: ['outings', 'mine'],
    queryFn: async () => {
      const { data } = await apiClient.get<OutingRecord[]>('/outings')
      return data
    },
  })
}

export function useTodayOutings() {
  return useQuery({
    queryKey: ['outings', 'today'],
    queryFn: async () => {
      const { data } = await apiClient.get<OutingRecord[]>('/outings/today')
      return data
    },
  })
}

export function useSearchOutings(params: { user_id?: string; start?: string; end?: string }, enabled = true) {
  return useQuery({
    queryKey: ['outings', 'search', params],
    queryFn: async () => {
      const { data } = await apiClient.get<OutingRecord[]>('/outings/search', { params })
      return data
    },
    enabled,
  })
}

export function useSubmitOuting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      outing_date: string
      destination: string
      leave_type_id?: string | null
      note?: string | null
    }) => {
      const { data } = await apiClient.post<OutingRecord>('/outings', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outings'] }),
  })
}

export function useDeleteOuting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/outings/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outings'] }),
  })
}
