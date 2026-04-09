import axios, { AxiosError } from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send httpOnly refresh cookie
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401: try to refresh, retry original request once
let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // refresh endpoint 本身失敗時不重試，直接 reject
    if (originalRequest.url?.includes('/auth/refresh')) {
      clearAccessToken()
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        originalRequest.headers!.Authorization = `Bearer ${token}`
        return apiClient(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post<{ accessToken: string }>(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      )
      const newToken = data.accessToken
      setAccessToken(newToken)
      processQueue(null, newToken)
      originalRequest.headers!.Authorization = `Bearer ${newToken}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      clearAccessToken()
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

// In-memory token storage (never localStorage)
let _accessToken: string | null = null

export function getAccessToken() { return _accessToken }
export function setAccessToken(token: string) { _accessToken = token }
export function clearAccessToken() { _accessToken = null }
