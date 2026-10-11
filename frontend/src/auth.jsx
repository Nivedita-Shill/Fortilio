import { createContext, useContext, useEffect, useState } from 'react'
import api from './api'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [avatar, setAvatar] = useState(null)
  const [loading, setLoading] = useState(!!localStorage.getItem('fs_token'))
  useEffect(() => {
    if (!localStorage.getItem('fs_token')) return
    api.get('/auth/me').then(r => setUser(r.data)).catch(() => localStorage.removeItem('fs_token')).finally(() => setLoading(false))
  }, [])
  useEffect(() => {
    if (!user) return setAvatar(null)
    api.get('/profile/avatar').then(r => setAvatar(r.data.data_url)).catch(() => {})
  }, [user?.id])
  const login = (token, u) => { localStorage.setItem('fs_token', token); setUser(u) }
  const logout = () => { localStorage.removeItem('fs_token'); setUser(null) }
  return <Ctx.Provider value={{ user, setUser, avatar, setAvatar, loading, login, logout }}>{children}</Ctx.Provider>
}
