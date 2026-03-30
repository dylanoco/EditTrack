import { useEffect, useState } from 'react'
import { Moon, Palette, Sun, User, Play } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { updateProfile } from '../api'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user, updateUser } = useAuth()
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  useEffect(() => { setDisplayName(user?.display_name ?? '') }, [user?.display_name])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const updated = await updateProfile({ display_name: displayName.trim() || null })
      updateUser(updated)
      setMessage('Profile updated.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const card = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900'
  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500'

  function restartTour() {
    localStorage.removeItem('edittrack_onboarding_complete')
    window.location.reload()
  }

  function restartSetup() {
    localStorage.removeItem('edittrack_setup_dismissed')
    window.location.href = '/dashboard'
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6" data-tour="settings">
      {/* Profile */}
      <div className={card}>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/15">
            <User className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Profile</h2>
            <p className="text-sm text-slate-500">{user?.email || 'Not set'}</p>
          </div>
        </div>
        {user?.avatar_url && (
          <img src={user.avatar_url} alt="" className="mb-4 h-16 w-16 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700" />
        )}
        <form onSubmit={handleSaveProfile} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
        {message && (
          <p className={`mt-3 text-sm ${message === 'Profile updated.' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {message}
          </p>
        )}
      </div>

      {/* Appearance */}
      <div className={card}>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-500/15">
            <Palette className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Appearance</h2>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              theme === 'light'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Sun className="h-4 w-4" /> Light
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              theme === 'dark'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Moon className="h-4 w-4" /> Dark
          </button>
        </div>
      </div>

      {/* Onboarding */}
      <div className={card} data-tour="settings-tour">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/15">
            <Play className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Onboarding</h2>
            <p className="text-sm text-slate-500">Get a guided tour of EditTrack's features.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={restartTour}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
          >
            Take Tour
          </button>
          <button
            type="button"
            onClick={restartSetup}
            className="rounded-xl border border-violet-300 px-4 py-2.5 text-sm font-semibold text-violet-600 hover:bg-violet-50 dark:border-violet-500/30 dark:text-violet-400 dark:hover:bg-violet-500/10"
          >
            Setup Guide
          </button>
        </div>
      </div>
    </div>
  )
}
