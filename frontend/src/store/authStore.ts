import { create } from 'zustand'
import { setAccessToken, clearAccessToken } from '@/api/client'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  role: 'admin' | 'manager' | 'employee'
  employeeId: string
  mustChangePassword: boolean
}

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  setAuth: (user: AuthUser, accessToken: string) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  setAuth: (user, accessToken) => {
    setAccessToken(accessToken)
    set({ user, isLoading: false })
  },

  clearAuth: () => {
    clearAccessToken()
    set({ user: null, isLoading: false })
  },

  setLoading: (isLoading) => set({ isLoading }),
}))
