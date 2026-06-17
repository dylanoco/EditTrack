import { clsx } from 'clsx'
import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { OnboardingTour } from '../OnboardingTour'
import { fetchSetupStatus } from '../../api'

const ONBOARDING_KEY = 'edittrack_onboarding_complete'

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        if (localStorage.getItem(ONBOARDING_KEY) === 'true') return
        const status = await fetchSetupStatus()
        if (!cancelled && status.client_count === 0) {
          navigate('/onboarding', { replace: true })
        }
      } catch { /* ignore */ }
    }
    check()
    return () => { cancelled = true }
  }, [navigate])

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <OnboardingTour />

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      <div
        className={clsx(
          'flex min-w-0 flex-1 flex-col transition-[margin] duration-300',
          sidebarCollapsed ? 'lg:ml-18' : 'lg:ml-64',
        )}
      >
        <Topbar
          pageTitle={location.pathname}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-5 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
