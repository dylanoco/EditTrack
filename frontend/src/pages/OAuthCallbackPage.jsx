import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { fetchMe } from '../api'

export function OAuthCallbackPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Complete OAuth login by reading token from callback query
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    async function finishOAuth() {
      localStorage.setItem('edittrack_token', token)
      try {
        const me = await fetchMe()
        login(token, me)
      } catch {
        login(token, null)
      }
      navigate('/dashboard', { replace: true })
    }

    finishOAuth()
  }, [login, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <p className="text-gray-500 dark:text-gray-400">Signing you in…</p>
    </div>
  )
}
