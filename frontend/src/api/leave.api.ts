import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface LeaveType {
  id: string
  code: string
  name_zh: string
  name_en: string
  is_paid: boolean
  requires_balance: boolean
  max_days_per_year: number | null
  carry_over_days: number
  is_active: boolean
}

export interface LeaveBalance {
  id: string
  user_id: string
  leave_type_id: string
  year: number
  allocated_mins: number
  used_mins: number
  carried_mins: number
  adjusted_mins: number
  leave_type?: LeaveType
}

export interface LeaveRequest {
  id: string
  user_id: string
  leave_type_id: string
  work_proxy_user_id: string | null
  start_time: string
  end_time: string
  duration_mins: number
  half_day: boolean
  half_day_period: 'am' | 'pm' | null
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'recalled'
  submitted_at: string
  created_at: string
  // joined
  leave_type_name?: string
  applicant_name?: string
  employee_id?: string
}

// ─── Leave Types ──────────────────────────────────────────────────────────────

export function useLeaveTypes() {
  return useQuery({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const { data } = await apiClient.get<LeaveType[]>('/leave/types')
      return data
    },
  })
}

export function useCreateLeaveType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Omit<LeaveType, 'id'>) => {
      const { data } = await apiClient.post<LeaveType>('/leave/types', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-types'] }),
  })
}

export function useUpdateLeaveType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Omit<LeaveType, 'id'>> }) => {
      const { data } = await apiClient.put<LeaveType>(`/leave/types/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-types'] }),
  })
}

// ─── Leave Balances ───────────────────────────────────────────────────────────

export function useLeaveBalances(year?: number) {
  const y = year ?? new Date().getFullYear()
  return useQuery({
    queryKey: ['leave-balances', y],
    queryFn: async () => {
      const { data } = await apiClient.get<LeaveBalance[]>('/leave/balances', { params: { year: y } })
      return data
    },
  })
}

export function useAllocateAnnual() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (year: number) => {
      const { data } = await apiClient.post('/leave/balances/allocate-annual', { year })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-balances'] }),
  })
}

// ─── Leave Requests ───────────────────────────────────────────────────────────

export function useMyLeaveRequests() {
  return useQuery({
    queryKey: ['leave-requests', 'mine'],
    queryFn: async () => {
      const { data } = await apiClient.get<LeaveRequest[]>('/leave/requests')
      return data
    },
  })
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['leave-requests', 'pending-approval'],
    queryFn: async () => {
      const { data } = await apiClient.get<LeaveRequest[]>('/leave/requests/pending-approval')
      return data
    },
  })
}

export function useSubmitLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      leave_type_id: string
      start_time: string
      end_time: string
      half_day: boolean
      half_day_period?: string | null
      work_proxy_user_id?: string | null
      reason?: string | null
    }) => {
      const { data } = await apiClient.post<LeaveRequest>('/leave/requests', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  })
}

export function useApproveLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      await apiClient.post(`/leave/requests/${id}/approve`, { comment })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  })
}

export function useRejectLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      await apiClient.post(`/leave/requests/${id}/reject`, { comment })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  })
}

export function useCancelLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/leave/requests/${id}/cancel`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  })
}
