import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface LeaveType {
  id: string
  code: string
  name_zh: string
  name_en: string
  is_paid: boolean
  requires_balance: boolean
  requires_attachment: boolean
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
  proxy_status: 'pending' | 'approved' | 'rejected' | null
  proxy_comment: string | null
  attachment_path: string | null
  submitted_at: string
  created_at: string
  // joined
  leave_type_name?: string
  leave_type_requires_attachment?: boolean
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
  return useQuery({
    queryKey: ['leave-balances', year ?? 'all'],
    queryFn: async () => {
      const params = year !== undefined ? { year } : {}
      const { data } = await apiClient.get<LeaveBalance[]>('/leave/balances', { params })
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

export interface AnnualLeavePreviewRow {
  user_id: string
  employee_id: string
  full_name: string
  department: string | null
  hire_date: string
  balance_id: string | null
  statutory_days: number
  allocated_mins: number
  used_mins: number
  carried_mins: number
  adjusted_mins: number
  remaining_mins: number
}

export function useAnnualLeavePreview(year: number) {
  return useQuery({
    queryKey: ['annual-preview', year],
    queryFn: async () => {
      const { data } = await apiClient.get<AnnualLeavePreviewRow[]>('/leave/annual-preview', { params: { year } })
      return data
    },
  })
}

export function useAdjustLeaveBalance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, adjusted_mins }: { id: string; adjusted_mins: number }) => {
      const { data } = await apiClient.put(`/leave/balances/${id}/adjust`, { adjusted_mins })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['annual-preview'] })
      qc.invalidateQueries({ queryKey: ['leave-balances'] })
    },
  })
}

// ─── Leave Requests ───────────────────────────────────────────────────────────

export interface LeaveRequestFilters {
  startDate?: string
  endDate?: string
  leaveTypeId?: string
}

export function useMyLeaveRequests(filters?: LeaveRequestFilters) {
  return useQuery({
    queryKey: ['leave-requests', 'mine', filters],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filters?.startDate) params.start_date = filters.startDate
      if (filters?.endDate) params.end_date = filters.endDate
      if (filters?.leaveTypeId) params.leave_type_id = filters.leaveTypeId
      const { data } = await apiClient.get<LeaveRequest[]>('/leave/requests', { params })
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

export function usePendingProxyRequests() {
  return useQuery({
    queryKey: ['leave-requests', 'proxy-pending'],
    queryFn: async () => {
      const { data } = await apiClient.get<LeaveRequest[]>('/leave/requests/proxy-pending')
      return data
    },
  })
}

export function useProxyApprove() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      await apiClient.post(`/leave/requests/${id}/proxy-approve`, { comment })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  })
}

export function useProxyReject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      await apiClient.post(`/leave/requests/${id}/proxy-reject`, { comment })
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

export function useDeleteLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/leave/requests/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  })
}

export function useUploadLeaveAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const form = new FormData()
      form.append('attachment', file)
      await apiClient.post(`/leave/requests/${id}/attachment`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-requests'] }),
  })
}

export async function openLeaveAttachment(requestId: string): Promise<void> {
  const { data } = await apiClient.get(`/leave/requests/${requestId}/attachment`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data)
  window.open(url, '_blank')
}
