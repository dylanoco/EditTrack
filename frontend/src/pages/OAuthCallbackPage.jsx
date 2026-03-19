import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function OAuthCallbackPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Stub: no real OAuth yet; redirect to dashboard and set stub user
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      login(token, { email: 'oauth@example.com', display_name: 'User' })
    } else {
      login('stub-token', { email: 'oauth@example.com', display_name: 'User' })
    }
    navigate('/dashboard', { replace: true })
  }, [login, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <p className="text-gray-500 dark:text-gray-400">Signing you in…</p>
    </div>
  )
}
