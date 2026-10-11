import axios from 'axios'
export const API = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const api = axios.create({ baseURL: API + '/api' })
api.interceptors.request.use(c => { const t = localStorage.getItem('fs_token'); if (t) c.headers.Authorization = 'Bearer ' + t; return c })
export const errMsg = e => {
  const d = e?.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map(x => `${(x.loc || []).slice(-1)[0]}: ${x.msg}`).join('. ')
  return 'Could not reach the server. Check your connection and try again.'
}
export const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0))
export const num = n => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n || 0))
export default api
