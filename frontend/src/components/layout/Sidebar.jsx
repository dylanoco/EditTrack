import { clsx } from 'clsx'
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, LayoutDashboard, Users, FileText, Link2, Receipt, Settings } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'

const navSimple = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/sources', label: 'Sources', icon: Link2 },
  { to: '/billing', label: 'Billing', icon: Receipt },
  { to: '/settings', label: 'Settings', icon: Settings },
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
  return (
    <aside className="flex w-56 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4 dark:border-gray-700">
        <div className="h-8 w-8 rounded-lg bg-violet-500" aria-hidden />
        <span className="font-semibold text-gray-900 dark:text-white">Editor Tracker</span>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
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
      </nav>
    </aside>
  )
}
