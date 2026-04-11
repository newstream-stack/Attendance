import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface MakeupPunchRules {
  id: number
  deadline_working_days: number
  reason_required: boolean
  updated_at: string
}

export interface MakeupPunchRequest {
  id: string
  user_id: string
  work_date: string
  punch_type: 'clock_in' | 'clock_out'
  requested_time: string
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reviewed_by: string | null
  review_comment: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  full_name?: string
  employee_id?: string
}

export interface SubmitMakeupPunchPayload {
  work_date: string
  punch_type: 'clock_in' | 'clock_out'
  requested_time: string
  reason?: string | null
}

// ─── Rules ───────────────────────────────────────────────────────────────────

export function useMakeupPunchRules() {
  return useQuery({
    queryKey: ['makeup-punch-rules'],
    queryFn: async () => {
      const { data } = await apiClient.get<MakeupPunchRules>('/makeup-punch/rules')
      return data
    },
  })
}

export function useUpdateMakeupPunchRules() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Pick<MakeupPunchRules, 'deadline_working_days' | 'reason_required'>>) => {
      const { data } = await apiClient.put<MakeupPunchRules>('/makeup-punch/rules', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['makeup-punch-rules'] }),
  })
}

// ─── Requests ─────────────────────────────────────────────────────────────────

export function useMyMakeupPunchRequests() {
  return useQuery({
    queryKey: ['makeup-punch-requests', 'mine'],
    queryFn: async () => {
      const { data } = await apiClient.get<MakeupPunchRequest[]>('/makeup-punch/requests')
      return data
    },
  })
}

export function useAllMakeupPunchRequests() {
  return useQuery({
    queryKey: ['makeup-punch-requests', 'all'],
    queryFn: async () => {
      const { data } = await apiClient.get<MakeupPunchRequest[]>('/makeup-punch/requests/all')
      return data
    },
  })
}

export function usePendingMakeupPunchRequests() {
  return useQuery({
    queryKey: ['makeup-punch-requests', 'pending'],
    queryFn: async () => {
      const { data } = await apiClient.get<MakeupPunchRequest[]>('/makeup-punch/requests/pending')
      return data
    },
  })
}

export function useSubmitMakeupPunchRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: SubmitMakeupPunchPayload) => {
      const { data } = await apiClient.post<MakeupPunchRequest>('/makeup-punch/requests', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['makeup-punch-requests'] }),
  })
}

export function useApproveMakeupPunchRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string | null }) => {
      await apiClient.post(`/makeup-punch/requests/${id}/approve`, { comment })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['makeup-punch-requests'] }),
  })
}

export function useRejectMakeupPunchRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string | null }) => {
      await apiClient.post(`/makeup-punch/requests/${id}/reject`, { comment })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['makeup-punch-requests'] }),
  })
}

export function useCancelMakeupPunchRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/makeup-punch/requests/${id}/cancel`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['makeup-punch-requests'] }),
  })
}
