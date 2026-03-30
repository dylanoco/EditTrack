import { useState, useEffect, useCallback } from 'react'
import { Joyride, STATUS, ACTIONS } from 'react-joyride'
import { useLocation } from 'react-router-dom'

const STORAGE_KEY = 'edittrack_tour_pending'

const steps = [
  {
    target: '[data-tour="sidebar"]',
    content: 'Welcome to EditTrack! This is your sidebar. Navigate between Dashboard, Clients, Deliverables, Sources, and Billing from here.',
    title: 'Welcome to EditTrack!',
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="dashboard"]',
    content: 'Your Dashboard gives you a complete revenue overview at a glance with KPI cards, charts, and recent activity.',
    title: 'Dashboard Overview',
    placement: 'center',
  },
  {
    target: '[data-tour="dashboard-kpis"]',
    content: 'Track your total revenue, paid vs unpaid breakdown, active clients, and payment collection rate in real-time.',
    title: 'Key Performance Indicators',
    placement: 'bottom',
  },
  {
    target: '[data-tour="dashboard-charts"]',
    content: 'Visualize your revenue trends and deliverable breakdowns with interactive charts.',
    title: 'Analytics Charts',
    placement: 'bottom',
  },
  {
    target: '[data-tour="notifications"]',
    content: 'Stay updated with notifications about new deliverables, synced sources, and more.',
    title: 'Notifications',
    placement: 'bottom',
  },
  {
    target: '[data-tour="sidebar"] nav a[href="/clients"]',
    content: 'Manage your clients here. Add their Twitch/YouTube info, set per-type pricing rates, and track their deliverables.',
    title: 'Clients Section',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar"] nav a[href="/deliverables"]',
    content: 'Track all your editing work: shorts, thumbnails, and videos. Edit details, manage payment status, and archive completed work.',
    title: 'Deliverables',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar"] nav a[href="/sources"]',
    content: 'Pull Twitch clips automatically to use as source material for your deliverables.',
    title: 'Fetch Sources',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar"] nav a[href="/billing"]',
    content: 'Create invoices, export CSVs, and track payment status for all your clients.',
    title: 'Billing',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar"] nav a[href="/settings"]',
    content: 'Update your profile, switch themes, and retake this tour anytime from Settings.',
    title: 'Settings',
    placement: 'right',
  },
]

const tooltipStyles = {
  options: {
    zIndex: 10000,
    primaryColor: '#7c3aed',
    arrowColor: '#7c3aed',
  },
  tooltip: {
    borderRadius: '1rem',
    padding: '1.25rem',
    backgroundColor: '#7c3aed',
    color: '#fff',
    boxShadow: '0 20px 40px rgba(124, 58, 237, 0.35)',
  },
  tooltipTitle: {
    fontSize: '16px',
    fontWeight: 700,
    marginBottom: '0.5rem',
    color: '#fff',
  },
  tooltipContent: {
    padding: '0.5rem 0 0',
    lineHeight: 1.6,
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  buttonNext: {
    borderRadius: '0.75rem',
    padding: '0.5rem 1.25rem',
    fontSize: '13px',
    fontWeight: 600,
    backgroundColor: '#fff',
    color: '#7c3aed',
  },
  buttonBack: {
    borderRadius: '0.75rem',
    padding: '0.5rem 1.25rem',
    fontSize: '13px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.7)',
    marginRight: '0.5rem',
  },
  buttonSkip: {
    borderRadius: '0.75rem',
    padding: '0.5rem 1rem',
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  buttonClose: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  spotlight: {
    borderRadius: '1rem',
  },
}

/**
 * Tour only runs when manually triggered via Settings ("Take Tour").
 * Settings sets a localStorage flag; this component picks it up on /dashboard
 * and clears it after running.
 */
export function OnboardingTour() {
  const [run, setRun] = useState(false)
  const location = useLocation()

  useEffect(() => {
    if (location.pathname !== '/dashboard') { setRun(false); return }
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') {
        localStorage.removeItem(STORAGE_KEY)
        const timer = setTimeout(() => setRun(true), 600)
        return () => clearTimeout(timer)
      }
    } catch { /* noop */ }
  }, [location.pathname])

  const handleCallback = useCallback((data) => {
    const { status, action, type } = data
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status) || action === ACTIONS.CLOSE || type === 'tour:end') {
      setRun(false)
    }
  }, [])

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      disableOverlayClose={false}
      callback={handleCallback}
      styles={tooltipStyles}
      locale={{ back: 'Back', close: 'Close', last: 'Finish', next: 'Next', skip: 'Skip tour' }}
    />
  )
}
