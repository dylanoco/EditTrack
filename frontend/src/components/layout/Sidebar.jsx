import { clsx } from 'clsx'
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, LayoutDashboard, Users, FileText, Link2, Receipt } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Bell, Moon, Search, Sun, User } from 'lucide-react'
import { useNotifications } from '../../contexts/NotificationsContext'
import { useSearch } from '../../contexts/SearchContext'
import { useTheme } from '../../contexts/ThemeContext'


const navSimple = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/sources', label: 'Sources', icon: Link2 },
  { to: '/billing', label: 'Billing', icon: Receipt },
]

const clientsSubnav = [
  { to: '/clients/create', label: 'Create Client' },
  { to: '/clients', label: 'List Clients', end: true },
]

const deliverablesSubnav = [
  { to: '/deliverables/create', label: 'Create Deliverable' },
  { to: '/deliverables', label: 'List Deliverables', end: true },
]

const linkClass = (isActive) =>
  clsx(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
  )
function ExpandableNavItem({ icon: Icon, label, basePath, items }) {
  const location = useLocation()
  const isActive = location.pathname.startsWith(basePath)
  const [expanded, setExpanded] = useState(isActive)

  useEffect(() => {
    if (isActive && !expanded) setExpanded(true)
  }, [isActive])

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={clsx(
          'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
        )}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-5 w-5 shrink-0" />
          {label}
        </span>
        {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
      </button>
      {expanded && (
        <div className="ml-4 space-y-0.5 border-l border-gray-200 pl-2 dark:border-gray-700">
          {items.map(({ to, label: subLabel, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive: subActive }) =>
                clsx(
                  'flex items-center rounded-lg px-3 py-2 text-sm transition-colors',
                  subActive
                    ? 'font-medium text-violet-600 dark:text-violet-400'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                )
              }
            >
              {subLabel}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { items, unreadCount, markAllRead, clearAll } = useNotifications()
  const { query, setQuery } = useSearch()
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const navigate = useNavigate()
  return (
    <aside className="flex w-70 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <nav className="flex-1 space-y-5 p-2">
      {/* Profile (left), Theme (right) */}
      <div className="flex items-center justify-between gap-1">
        <div className="relative">
          <button
            type="button"
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300">
                <User className="h-4 w-4" />
              </div>
            )}
            <span className="hidden text-sm font-medium text-gray-700 dark:text-gray-200 sm:block">
              {user?.display_name || user?.email || 'Account'}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </button>
          {profileOpen && (
            <>
              <div className="fixed inset-0 z-10" aria-hidden onClick={() => setProfileOpen(false)} />
              <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  onClick={() => { setProfileOpen(false); navigate('/settings') }}
                >
                  Settings
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  onClick={() => { setProfileOpen(false); logout(); navigate('/login') }}
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
        <NavLink to="/dashboard" className={({ isActive }) => linkClass(isActive)}>
          <LayoutDashboard className="h-5 w-5 shrink-0" />
          Dashboard
        </NavLink>
        <ExpandableNavItem icon={Users} label="Clients" basePath="/clients" items={clientsSubnav} />
        <ExpandableNavItem icon={FileText} label="Deliverables" basePath="/deliverables" items={deliverablesSubnav} />
        {navSimple.slice(2).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => linkClass(isActive)}>
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false) }}
            className={clsx(
              'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              notifOpen
                ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
            )}
          >
            <span className="flex items-center gap-3">
              <span className="relative">
                <Bell className="h-5 w-5 shrink-0" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-medium text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>
              Notifications
            </span>
            {notifOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          </button>
          {notifOpen && (
            <div className="ml-4 border-l border-gray-200 pl-2 dark:border-gray-700">
              <div className="rounded-lg border border-gray-200 bg-white py-2 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between px-3 pb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Notifications</span>
                  {items.length > 0 && (
                    <div className="flex gap-1">
                      <button type="button" onClick={markAllRead} className="text-xs text-violet-600 hover:underline dark:text-violet-400">
                        Mark read
                      </button>
                      <button type="button" onClick={clearAll} className="text-xs text-gray-500 hover:underline dark:text-gray-400">
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                {items.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No notifications yet.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {items.map((n) => (
                      <div key={n.id} className={`border-b border-gray-100 px-3 py-2 last:border-0 dark:border-gray-700 ${!n.read ? 'bg-violet-50/50 dark:bg-violet-900/10' : ''}`}>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</p>
                        {n.message && <p className="text-xs text-gray-500 dark:text-gray-400">{n.message}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </aside>
  )
}
