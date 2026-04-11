import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface PublicHoliday {
  id: string
  holiday_date: string
  name: string
  year: number
}

export function usePublicHolidays(year: number) {
  return useQuery({
    queryKey: ['public-holidays', year],
    queryFn: async () => {
      const { data } = await apiClient.get<PublicHoliday[]>('/public-holidays', { params: { year } })
      return data
    },
  })
}

export function useCreatePublicHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { holiday_date: string; name: string }) => {
      const { data } = await apiClient.post<PublicHoliday>('/public-holidays', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['public-holidays'] }),
  })
}

export function useDeletePublicHoliday() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/public-holidays/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['public-holidays'] }),
  })
}
