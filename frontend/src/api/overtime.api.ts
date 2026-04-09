import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface OvertimeRequest {
  id: string
  user_id: string
  work_date: string
  start_time: string
  end_time: string
  duration_mins: number
  reason: string | null
  convert_to_comp: boolean
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  submitted_at: string
  created_at: string
  // joined
  full_name?: string
  employee_id?: string
}

export function useMyOvertimeRequests() {
  return useQuery({
    queryKey: ['overtime', 'mine'],
    queryFn: async () => {
      const { data } = await apiClient.get<OvertimeRequest[]>('/overtime/requests')
      return data
    },
  })
}

export function usePendingOvertimeApprovals() {
  return useQuery({
    queryKey: ['overtime', 'pending-approval'],
    queryFn: async () => {
      const { data } = await apiClient.get<OvertimeRequest[]>('/overtime/requests/pending-approval')
      return data
    },
  })
}

export function useSubmitOvertimeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      work_date: string
      start_time: string
      end_time: string
      reason?: string | null
      convert_to_comp: boolean
    }) => {
      const { data } = await apiClient.post<OvertimeRequest>('/overtime/requests', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['overtime'] }),
  })
}

export function useApproveOvertimeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      await apiClient.post(`/overtime/requests/${id}/approve`, { comment })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['overtime'] })
      qc.invalidateQueries({ queryKey: ['leave-balances'] })
    },
  })
}

export function useRejectOvertimeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      await apiClient.post(`/overtime/requests/${id}/reject`, { comment })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['overtime'] }),
  })
}

export function useCancelOvertimeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/overtime/requests/${id}/cancel`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['overtime'] }),
  })
}
