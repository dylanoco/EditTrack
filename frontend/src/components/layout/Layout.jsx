import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { OnboardingTour } from '../OnboardingTour'
import { fetchSetupStatus } from '../../api'

const ONBOARDING_KEY = 'edittrack_onboarding_complete'

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        if (localStorage.getItem(ONBOARDING_KEY) === 'true') return
        const status = await fetchSetupStatus()
        if (!cancelled && status.client_count === 0) {
          navigate('/onboarding', { replace: true })
        }
      } catch { /* ignore — network errors shouldn't block the app */ }
    }
    check()
    return () => { cancelled = true }
  }, [navigate])

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
