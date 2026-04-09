import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1'

// Use plain axios (no interceptor) for unauthenticated auth endpoints
export async function apiForgotPassword(email: string): Promise<void> {
  await axios.post(`${BASE_URL}/auth/forgot-password`, { email })
}

export async function apiResetPassword(token: string, newPassword: string): Promise<void> {
  await axios.post(`${BASE_URL}/auth/reset-password`, { token, newPassword })
}
