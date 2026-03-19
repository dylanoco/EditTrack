import { createContext, useCallback, useContext, useState } from 'react'
import { getStoredUser, getToken, removeToken, setStoredUser, setToken } from '../lib/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser())
  const [token, setTokenState] = useState(getToken())

  const login = useCallback((newToken, userData) => {
    setToken(newToken)
    setTokenState(newToken)
    setStoredUser(userData || null)
    setUser(userData || null)
  }, [])

  const logout = useCallback(() => {
    removeToken()
    setTokenState(null)
    setUser(null)
  }, [])

  const updateUser = useCallback((userData) => {
    setStoredUser(userData)
    setUser(userData)
  }, [])

  const value = {
    user,
    token,
    isAuthenticated: !!token,
    login,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
