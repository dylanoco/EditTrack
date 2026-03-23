import { Bell, ChevronDown, Menu, Moon, Search, Sun } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useNotifications } from '../../contexts/NotificationsContext'
import { useSearch } from '../../contexts/SearchContext'
import { useTheme } from '../../contexts/ThemeContext'

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

export function Topbar({ sidebarCollapsed, onToggleSidebar }) {
  const { theme, toggleTheme } = useTheme()
  const { items, unreadCount, markAllRead, clearAll } = useNotifications()
  const { query, setQuery } = useSearch()
  const [notifOpen, setNotifOpen] = useState(false)
  const location = useLocation()

  const pageTitle = pageTitles[location.pathname] || (location.pathname.startsWith('/clients/') ? 'Client' : '')

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/80 md:px-6">
      {/* Left: page title + search */}
      <div className="flex items-center gap-4 flex-1">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        {pageTitle && (
          <h2 className="hidden text-lg font-semibold text-slate-900 dark:text-white md:block">{pageTitle}</h2>
        )}
        <div className="relative w-full max-w-xs">
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

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <div className="relative" data-tour="notifications">
          <button
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-violet-500/30">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
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
