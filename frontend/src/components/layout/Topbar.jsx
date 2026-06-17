import { Bell, Menu, Moon, Search, Sun } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { useNotifications } from '../../contexts/NotificationsContext'
import { useSearch } from '../../contexts/SearchContext'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/clients': 'Clients',
  '/clients/create': 'Create Client',
  '/deliverables': 'Deliverables',
  '/deliverables/create': 'Create Deliverable',
  '/sources': 'Sources',
  '/billing': 'Billing',
  '/settings': 'Settings',
}

function resolvePageTitle(pathname) {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (pathname.startsWith('/clients/')) return 'Client'
  return ''
}

export function Topbar({ pageTitle: pathname, onOpenMobileMenu }) {
  const { theme, toggleTheme } = useTheme()
  const { items, unreadCount, markAllRead, clearAll } = useNotifications()
  const { query, setQuery } = useSearch()
  const [notifOpen, setNotifOpen] = useState(false)

  const title = resolvePageTitle(pathname)

  return (
    <header className="sticky top-0 z-20 flex h-14 sm:h-16 items-center justify-between gap-2 border-b border-slate-200/80 bg-white/80 px-3 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/80 sm:gap-4 sm:px-4 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="shrink-0 rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {title && (
          <h2 className="truncate text-base font-semibold text-slate-900 dark:text-white sm:text-lg lg:hidden">
            {title}
          </h2>
        )}

        {title && (
          <h2 className="hidden text-lg font-semibold text-slate-900 dark:text-white lg:block">{title}</h2>
        )}

        <div className="relative hidden min-w-0 flex-1 sm:block sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="relative" data-tour="notifications">
          <button
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-violet-500/30">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-2 w-[calc(100vw-1.5rem)] max-w-80 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800 sm:w-80">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</span>
                  {items.length > 0 && (
                    <div className="flex gap-2">
                      <button type="button" onClick={markAllRead} className="text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400">
                        Mark read
                      </button>
                      <button type="button" onClick={clearAll} className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {items.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications yet.</p>
                  ) : (
                    items.map((n) => (
                      <div key={n.id} className={`border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-700/50 ${!n.read ? 'bg-violet-50/50 dark:bg-violet-500/5' : ''}`}>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{n.title}</p>
                        {n.message && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{n.message}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
