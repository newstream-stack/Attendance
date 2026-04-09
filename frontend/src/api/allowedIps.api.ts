import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface AllowedIpRow {
  id: string
  ip_address: string
  label: string | null
  created_by: string
  created_at: string
}

export function useAllowedIps() {
  return useQuery({
    queryKey: ['allowed-ips'],
    queryFn: async () => {
      const { data } = await apiClient.get<AllowedIpRow[]>('/allowed-ips')
      return data
    },
  })
}

export function useCreateAllowedIp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { ip_address: string; label?: string | null }) => {
      const { data } = await apiClient.post<AllowedIpRow>('/allowed-ips', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['allowed-ips'] }),
  })
}

export function useDeleteAllowedIp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/allowed-ips/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['allowed-ips'] }),
  })
}
