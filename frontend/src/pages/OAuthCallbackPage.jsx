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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Signing you in...</p>
      </div>
    </div>
  )
}
