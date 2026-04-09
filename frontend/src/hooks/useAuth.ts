import { useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { apiClient } from '@/api/client'

export function useAuth() {
  const { user, isLoading, setAuth, clearAuth } = useAuthStore()

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post<{
      accessToken: string
      user: {
        id: string
        email: string
        fullName: string
        role: 'admin' | 'manager' | 'employee'
        employeeId: string
        mustChangePassword: boolean
      }
    }>('/auth/login', { email, password })
    setAuth(data.user, data.accessToken)
    return data.user
  }, [setAuth])

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      clearAuth()
    }
  }, [clearAuth])

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    await apiClient.post('/auth/change-password', { oldPassword, newPassword })
  }, [])

  return { user, isLoading, login, logout, changePassword }
}
