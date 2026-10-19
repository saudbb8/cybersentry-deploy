import axios from 'axios'

axios.defaults.timeout = 30000
export const API = (import.meta.env.VITE_API_URL || 'http://localhost:8001').trim().replace(/\/+$/, '')

export function apiError(error, fallback = 'Request failed. Please try again.') {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'The server took too long to respond. Please try again shortly.'
  }
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map(item => item.msg).filter(Boolean).join('; ') || fallback
  if (!error.response) return 'Cannot reach the server. Please check your connection and try again.'
  return fallback
}
