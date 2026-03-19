import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Profile</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{user?.email || 'Not set'}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Display name: {user?.display_name || '—'}</p>
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
