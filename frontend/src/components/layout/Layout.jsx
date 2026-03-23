import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { OnboardingTour } from '../OnboardingTour'

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <OnboardingTour />
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
      <div className="flex flex-1 flex-col min-w-0" style={{ marginLeft: sidebarCollapsed ? '4.5rem' : '16rem' }}>
        <Topbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed((c) => !c)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
