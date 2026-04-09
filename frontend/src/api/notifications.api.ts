import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface AppNotification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  is_read: boolean
  reference_type: string | null
  reference_id: string | null
  created_at: string
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ notifications: AppNotification[]; unread: number }>('/notifications')
      return data
    },
    refetchInterval: 30_000,
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.put(`/notifications/${id}/read`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await apiClient.put('/notifications/read-all')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
