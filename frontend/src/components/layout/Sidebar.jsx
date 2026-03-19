import { clsx } from 'clsx'
import { LayoutDashboard, Users, FileText, Link2, Receipt, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/deliverables', label: 'Deliverables', icon: FileText },
  { to: '/sources', label: 'Sources', icon: Link2 },
  { to: '/billing', label: 'Billing', icon: Receipt },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="flex w-56 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4 dark:border-gray-700">
        <div className="h-8 w-8 rounded-lg bg-violet-500" aria-hidden />
        <span className="font-semibold text-gray-900 dark:text-white">Editor Tracker</span>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
