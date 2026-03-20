import { useEffect, useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { updateProfile } from '../api'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user, updateUser } = useAuth()
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  useEffect(() => {
    setDisplayName(user?.display_name ?? '')
  }, [user?.display_name])
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

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Profile</h2>
        {user?.avatar_url && (
          <img src={user.avatar_url} alt="" className="mt-2 h-16 w-16 rounded-full object-cover" />
        )}
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{user?.email || 'Not set'}</p>
        <form onSubmit={handleSaveProfile} className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[200px]">
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
        {message && (
          <p className={`mt-2 text-sm ${message === 'Profile updated.' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {message}
          </p>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Appearance</h2>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${theme === 'light' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
          >
            Light
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${theme === 'dark' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}
          >
            Dark
          </button>
        </div>
      </section>
    </div>
  )
}
