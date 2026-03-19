const TOKEN_KEY = 'edittrack_token'
const USER_KEY = 'edittrack_user'

export function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
}

export function setToken(token) {
  if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  if (typeof window !== 'undefined') {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  }
}

export function isAuthenticated() {
  return !!getToken()
}
