import { useEffect, useCallback } from 'react'
import axios from 'axios'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
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

// 用原生 axios（不走 interceptor）做 session 恢復，避免 401 redirect 循環
// 同時監聽 visibilitychange / online 事件：
//   - visibilitychange (visible)：app 從背景切回前景時重新取得 token
//   - online：網路切換（例如接上 WiFi）時重建連線並刷新所有資料
function AppInitializer() {
  const { setAuth, clearAuth } = useAuthStore()
  const qc = useQueryClient()

  const tryRefresh = useCallback(async () => {
    try {
      const { data } = await axios.post<{ accessToken: string; user: AuthUser }>(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      setAuth(data.user, data.accessToken)
    } catch {
      clearAuth()
    }
  }, [setAuth, clearAuth])

  useEffect(() => {
    tryRefresh()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        tryRefresh()
        qc.invalidateQueries()
      }
    }

    const handleOnline = () => {
      tryRefresh()
      qc.invalidateQueries()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('online', handleOnline)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('online', handleOnline)
    }
  }, [tryRefresh, qc])

  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInitializer />
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  )
}
