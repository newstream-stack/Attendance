import { useEffect } from 'react'
import axios from 'axios'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore, AuthUser } from '@/store/authStore'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

// 用原生 axios（不走 interceptor）做初始 session 恢復，避免 401 redirect 循環
function AuthInitializer() {
  const { setAuth, clearAuth } = useAuthStore()

  useEffect(() => {
    axios
      .post<{ accessToken: string; user: AuthUser }>(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .then(({ data }) => {
        setAuth(data.user, data.accessToken)
      })
      .catch(() => {
        clearAuth()
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer />
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  )
}
