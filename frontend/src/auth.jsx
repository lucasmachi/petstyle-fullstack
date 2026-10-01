import { createContext, useContext, useEffect, useState } from 'react'
import { api, json, setCsrf } from './api'
const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState({ demo_mode: false })
  useEffect(() => {
    api('/config').then(setConfig).catch(() => {})
    api('/auth/me').then(data => { setUser(data.user); setCsrf(data.csrf_token) }).catch(() => setCsrf('')).finally(() => setLoading(false))
  }, [])
  async function authenticate(mode, body) {
    const data = await api(`/auth/${mode}`, json('POST', body))
    setCsrf(data.csrf_token); setUser(data.user)
    return data.user
  }
  async function logout() {
    await api('/auth/logout', { method: 'POST' }); setCsrf(''); setUser(null)
  }
  return <AuthContext.Provider value={{ user, loading, config, authenticate, logout }}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)
