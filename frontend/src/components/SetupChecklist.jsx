import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Sparkles, X } from 'lucide-react'
import { fetchSetupStatus } from '../api'

const DISMISS_KEY = 'edittrack_setup_dismissed'

export function SetupChecklist() {
  const [status, setStatus] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try { if (localStorage.getItem(DISMISS_KEY) === 'true') { setDismissed(true); return } } catch {}
    let cancelled = false
    async function load() {
      try {
        const data = await fetchSetupStatus()
        if (!cancelled) setStatus(data)
      } catch {}
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  function dismiss() {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, 'true') } catch {}
  }

  if (dismissed || loading || !status) return null

  const hasClient = status.client_count > 0
  const hasDeliverable = status.deliverable_count > 0
  if (hasClient && hasDeliverable) return null

  const steps = [
    { done: hasClient, label: 'Add your first client', to: '/clients/create', hint: 'Set up a client with their name and your rates — like adding a row to your spreadsheet.' },
    { done: hasDeliverable, label: 'Create your first deliverable', to: '/deliverables/create', hint: 'Log a piece of work (short, thumbnail, or video) — EditTrack handles the rest.' },
  ]

  const completedCount = steps.filter((s) => s.done).length

  return (
    <div className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm dark:border-violet-500/20 dark:bg-violet-500/5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/15">
            <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Get started with EditTrack</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Two quick steps to replace your messy spreadsheet. {completedCount}/{steps.length} done.
            </p>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-200/50 hover:text-slate-600 dark:hover:bg-slate-700/50" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {steps.map((step, i) => (
          <Link
            key={i}
            to={step.done ? '#' : step.to}
            onClick={step.done ? (e) => e.preventDefault() : undefined}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
              step.done
                ? 'bg-white/60 dark:bg-slate-800/40'
                : 'bg-white hover:bg-violet-100/60 dark:bg-slate-800/60 dark:hover:bg-slate-700/60'
            }`}
          >
            <CheckCircle2 className={`h-5 w-5 shrink-0 ${step.done ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${step.done ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                {step.label}
              </p>
              {!step.done && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{step.hint}</p>}
            </div>
            {!step.done && <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
          </Link>
        ))}
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-violet-500 transition-all duration-500"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>
    </div>
  )
}
