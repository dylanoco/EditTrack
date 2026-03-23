import { clsx } from 'clsx'
import { useEffect, useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Link2,
  LogOut,
  Receipt,
  Settings,
  Users,
} from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

const expandableItems = [
  {
    icon: Users,
    label: 'Clients',
    basePath: '/clients',
    items: [
      { to: '/clients', label: 'List Clients', end: true },
      { to: '/clients/create', label: 'Create Client' },
    ],
  },
  {
    icon: FileText,
    label: 'Deliverables',
    basePath: '/deliverables',
    items: [
      { to: '/deliverables', label: 'List Deliverables', end: true },
      { to: '/deliverables/create', label: 'Create Deliverable' },
    ],
  },
]

const bottomNavItems = [
  { to: '/sources', label: 'Sources', icon: Link2 },
  { to: '/billing', label: 'Billing', icon: Receipt },
]

function ExpandableNavItem({ icon: Icon, label, basePath, items, collapsed }) {
  const location = useLocation()
  const isActive = location.pathname.startsWith(basePath)
  const [expanded, setExpanded] = useState(isActive)

  useEffect(() => {
    if (isActive && !expanded) setExpanded(true)
  }, [isActive])

  if (collapsed) {
    return (
      <NavLink
        to={items[0]?.to || basePath}
        className={({ isActive: linkActive }) =>
          clsx(
            'flex items-center justify-center rounded-xl p-2.5 transition-all duration-200',
            linkActive || isActive
              ? 'bg-violet-500/15 text-violet-400 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.2)]'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          )
        }
        title={label}
      >
        <Icon className="h-5 w-5" />
      </NavLink>
    )
  }

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={clsx(
          'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-violet-500/15 text-violet-400 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.2)]'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        )}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-5 w-5 shrink-0" />
          {label}
        </span>
        {expanded ? <ChevronDown className="h-4 w-4 shrink-0 opacity-50" /> : <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />}
      </button>
      <div
        className={clsx(
          'ml-4 space-y-0.5 border-l border-slate-700/50 pl-3 overflow-hidden transition-all duration-200',
          expanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {items.map(({ to, label: subLabel, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive: subActive }) =>
              clsx(
                'flex items-center rounded-lg px-3 py-2 text-sm transition-all duration-200',
                subActive
                  ? 'font-medium text-violet-400'
                  : 'text-slate-500 hover:text-slate-300'
              )
            }
          >
            {subLabel}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)

  const linkClass = (isActive) =>
    clsx(
      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
      collapsed && 'justify-center px-0',
      isActive
        ? 'bg-violet-500/15 text-violet-400 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.2)]'
        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
    )

  return (
    <aside
      data-tour="sidebar"
      className={clsx(
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-slate-800/60 bg-slate-900 transition-all duration-300',
        collapsed ? 'w-18' : 'w-64'
      )}
    >
      {/* Brand */}
      <div className={clsx('flex items-center border-b border-slate-800/60 px-4 py-4', collapsed && 'justify-center px-2')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-violet-700 text-sm font-bold text-white shadow-lg shadow-violet-500/20">
          ET
        </div>
        {!collapsed && (
          <div className="ml-3">
            <p className="text-sm font-semibold text-white">EditTrack</p>
            <p className="text-[11px] text-slate-500">Editor toolkit</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => linkClass(isActive)} title={collapsed ? label : undefined}>
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}

        {expandableItems.map((item) => (
          <ExpandableNavItem key={item.basePath} {...item} collapsed={collapsed} />
        ))}

        <div className="my-3 border-t border-slate-800/60" />

        {bottomNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => linkClass(isActive)} title={collapsed ? label : undefined}>
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: Profile + Collapse */}
      <div className="border-t border-slate-800/60 p-3 space-y-2">
        <NavLink to="/settings" className={({ isActive }) => linkClass(isActive)} title={collapsed ? 'Settings' : undefined}>
          <Settings className="h-5 w-5 shrink-0" />
          {!collapsed && 'Settings'}
        </NavLink>

        {/* Profile */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className={clsx(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 hover:bg-white/5',
              collapsed && 'justify-center px-0'
            )}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-slate-700" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-semibold text-violet-400 ring-2 ring-slate-700">
                {(user?.display_name || user?.email || '?')[0].toUpperCase()}
              </div>
            )}
            {!collapsed && (
              <>
                <div className="flex-1 text-left min-w-0">
                  <p className="truncate text-sm font-medium text-slate-200">
                    {user?.display_name || user?.email || 'Account'}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
              </>
            )}
          </button>
          {profileOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
              <div className="absolute bottom-full left-0 z-20 mb-1 w-48 rounded-xl border border-slate-700 bg-slate-800 py-1.5 shadow-xl">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white"
                  onClick={() => { setProfileOpen(false); navigate('/settings') }}
                >
                  <Settings className="h-4 w-4" /> Settings
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                  onClick={() => { setProfileOpen(false); logout(); navigate('/login') }}
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-xl p-2 text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all duration-200"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}
