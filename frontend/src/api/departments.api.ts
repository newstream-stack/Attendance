import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface Department {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await apiClient.get<Department[]>('/departments')
      return data
    },
  })
}

export function useCreateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string | null }) => {
      const { data } = await apiClient.post<Department>('/departments', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  })
}

export function useUpdateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { name?: string; description?: string | null; is_active?: boolean } }) => {
      const { data } = await apiClient.put<Department>(`/departments/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  })
}
