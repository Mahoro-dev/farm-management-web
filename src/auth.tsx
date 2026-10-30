import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { api, TOKEN_KEY, type AuthResponse, type User } from './api'

type AuthValue = {
  user: User | null
  ready: boolean
  signIn: (email: string, password: string) => Promise<void>
  accept: (auth: AuthResponse) => void
  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  const accept = useCallback((auth: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, auth.token)
    setUser(auth.user)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = await api<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    accept(auth)
  }, [accept])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [])

  useEffect(() => {
    const onUnauthorized = () => setUser(null)
    window.addEventListener('farm:unauthorized', onUnauthorized)
    return () => window.removeEventListener('farm:unauthorized', onUnauthorized)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setReady(true)
      return
    }
    let live = true
    api<User>('/api/auth/me')
      .then((me) => {
        if (live) setUser(me)
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
      })
      .finally(() => {
        if (live) setReady(true)
      })
    return () => {
      live = false
    }
  }, [])

  const value = useMemo(() => ({ user, ready, signIn, accept, logout }), [user, ready, signIn, accept, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is missing')
  return value
}

export function RequireAuth() {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <div className="boot">Loading the farm desk…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
