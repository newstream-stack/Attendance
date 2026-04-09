import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface ProxyAssignment {
  id: string
  principal_id: string
  proxy_id: string
  proxy_name: string
  start_date: string
  end_date: string
  scope: 'leave_approval' | 'all'
  is_active: boolean
  created_by: string
  created_at: string
}

export function useMyProxies() {
  return useQuery({
    queryKey: ['proxy'],
    queryFn: async () => {
      const { data } = await apiClient.get<ProxyAssignment[]>('/proxy')
      return data
    },
  })
}

export function useCreateProxy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      proxy_id: string
      start_date: string
      end_date: string
      scope: 'leave_approval' | 'all'
    }) => {
      const { data } = await apiClient.post<ProxyAssignment>('/proxy', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proxy'] }),
  })
}

export function useUpdateProxy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { is_active?: boolean; end_date?: string } }) => {
      const { data } = await apiClient.put<ProxyAssignment>(`/proxy/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proxy'] }),
  })
}

export function useDeleteProxy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/proxy/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proxy'] }),
  })
}
