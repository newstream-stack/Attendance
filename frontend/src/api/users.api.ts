import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'

export interface UserRow {
  id: string
  employee_id: string
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'employee'
  department: string | null
  position: string | null
  hire_date: string
  manager_id: string | null
  is_active: boolean
  track_attendance: boolean
  is_special_dispatch: boolean
  must_change_password: boolean
  created_at: string
}

export interface ManagerOption {
  id: string
  full_name: string
  employee_id: string
}

export interface CreateUserPayload {
  employee_id: string
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'employee'
  department?: string
  position?: string
  hire_date: string
  manager_id?: string | null
  track_attendance?: boolean
  is_special_dispatch?: boolean
}

export interface UpdateUserPayload {
  employee_id?: string
  email?: string
  full_name?: string
  role?: 'admin' | 'manager' | 'employee'
  department?: string | null
  position?: string | null
  hire_date?: string
  manager_id?: string | null
  track_attendance?: boolean
  is_special_dispatch?: boolean
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await apiClient.get<UserRow[]>('/users')
      return data
    },
  })
}

export function useManagers() {
  return useQuery({
    queryKey: ['managers'],
    queryFn: async () => {
      const { data } = await apiClient.get<ManagerOption[]>('/users/managers')
      return data
    },
  })
}

export interface ColleagueOption {
  id: string
  full_name: string
  employee_id: string
  role: string
}

export function useSendResetEmail() {
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/users/${id}/send-reset-email`)
    },
  })
}

export function useColleagues() {
  return useQuery({
    queryKey: ['colleagues'],
    queryFn: async () => {
      const { data } = await apiClient.get<ColleagueOption[]>('/users/colleagues')
      return data
    },
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const { data } = await apiClient.post<UserRow>('/users', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateUserPayload }) => {
      const { data } = await apiClient.put<UserRow>(`/users/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/users/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useAdminResetPassword() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<{ password: string }>(`/users/${id}/reset-password`)
      return data
    },
  })
}

export function useToggleUserActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiClient.put(`/users/${id}/${isActive ? 'reactivate' : 'deactivate'}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
