import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Sparkles, User, FileText, X } from 'lucide-react'
import { createClient, createDeliverable } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationsContext'

const STORAGE_KEY = 'edittrack_onboarding_complete'

function markOnboardingDone() {
  try { localStorage.setItem(STORAGE_KEY, 'true') } catch { /* noop */ }
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [clientForm, setClientForm] = useState({ name: '', twitch: '', price_short: 20, price_thumbnail: 10, price_video: 50, info_sections: [] })
  const [createdClient, setCreatedClient] = useState(null)

  const [delivForm, setDelivForm] = useState({ title: '', type: 'short' })
  const [createdDeliv, setCreatedDeliv] = useState(null)

  function skip() {
    markOnboardingDone()
    navigate('/dashboard', { replace: true })
  }

  async function handleCreateClient(e) {
    e.preventDefault()
    setError(null); setSubmitting(true)
    try {
      const socials = {}
      if (clientForm.twitch.trim()) socials.twitch = clientForm.twitch.trim()
      const cleaned = clientForm.info_sections
        .filter((s) => s.title.trim() || s.body.trim())
        .map((s) => ({ ...s, title: s.title.trim(), body: s.body.trim() }))
      const client = await createClient({
        name: clientForm.name.trim(),
        socials: Object.keys(socials).length ? socials : null,
        info_sections: cleaned.length ? cleaned : null,
        price_short: Number(clientForm.price_short),
        price_thumbnail: Number(clientForm.price_thumbnail),
        price_video: Number(clientForm.price_video),
      })
      setCreatedClient(client)
      addNotification({ type: 'success', title: 'Client created', message: clientForm.name.trim() })
      setStep(3)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setSubmitting(false) }
  }

  async function handleCreateDeliverable(e) {
    e.preventDefault()
    if (!createdClient) return
    setError(null); setSubmitting(true)
    try {
      const deliv = await createDeliverable({
        client_id: createdClient.id,
        title: delivForm.title.trim(),
        type: delivForm.type,
        status: 'todo',
        payment_status: 'unpaid',
        price_mode: 'auto',
      })
      setCreatedDeliv(deliv)
      addNotification({ type: 'success', title: 'Deliverable created', message: delivForm.title.trim() })
      markOnboardingDone()
      setStep(4)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setSubmitting(false) }
  }

  const firstName = (user?.display_name || user?.email || '').split(/[\s@]/)[0]
  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500'

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-10 h-1 bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full bg-violet-600 transition-all duration-500 ease-out"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">

          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="animate-in fade-in text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-500/15">
                <Sparkles className="h-8 w-8 text-violet-600 dark:text-violet-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Welcome{firstName ? `, ${firstName}` : ''}!
              </h1>
              <p className="mt-3 text-base text-slate-500 dark:text-slate-400">
                Let's set up your first client and deliverable — takes under a minute.
              </p>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 hover:bg-violet-700 transition-colors"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-6">
                <button type="button" onClick={skip} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  Skip setup
                </button>
              </p>
            </div>
          )}

          {/* Step 2: Create Client */}
          {step === 2 && (
            <div className="animate-in fade-in">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/15">
                  <User className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Step 1 of 2</p>
                <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Add your first client</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Who do you edit for?</p>
              </div>

              {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">{error}</div>}

              <form onSubmit={handleCreateClient} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Client name</span>
                    <input
                      required
                      type="text"
                      placeholder="e.g. NeroZYN"
                      value={clientForm.name}
                      onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))}
                      className={inputClass}
                      autoFocus
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Twitch username <span className="text-slate-400 font-normal">(optional)</span></span>
                    <input
                      type="text"
                      placeholder="Used to fetch clips later"
                      value={clientForm.twitch}
                      onChange={(e) => setClientForm((f) => ({ ...f, twitch: e.target.value }))}
                      className={inputClass}
                    />
                  </label>

                  <div>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Client info <span className="text-slate-400 font-normal">(optional)</span></span>
                    <div className="max-h-52 overflow-y-auto">
                      {clientForm.info_sections.map((section, i) => (
                        <div key={section.id} className="mb-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                          <div className="flex items-center gap-2 mb-1.5">
                            <input
                              type="text"
                              placeholder="Category (e.g. Preferences, Schedule)"
                              value={section.title}
                              onChange={(e) => {
                                const updated = [...clientForm.info_sections]
                                updated[i] = { ...updated[i], title: e.target.value }
                                setClientForm((f) => ({ ...f, info_sections: updated }))
                              }}
                              className={inputClass}
                            />
                            <button type="button" onClick={() => setClientForm((f) => ({ ...f, info_sections: f.info_sections.filter((_, idx) => idx !== i) }))} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            placeholder="Details..."
                            value={section.body}
                            onChange={(e) => {
                              const updated = [...clientForm.info_sections]
                              updated[i] = { ...updated[i], body: e.target.value }
                              setClientForm((f) => ({ ...f, info_sections: updated }))
                            }}
                            className={`${inputClass} resize-none`}
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setClientForm((f) => ({ ...f, info_sections: [...f.info_sections, { id: crypto.randomUUID(), title: '', body: '' }] }))}
                      className="mt-1 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400"
                    >
                      + Add section
                    </button>
                  </div>

                  <div>
                    <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Your rates <span className="text-slate-400 font-normal">(per deliverable)</span></span>
                    <div className="grid grid-cols-3 gap-3">
                      <label className="block">
                        <span className="mb-1 block text-center text-xs text-slate-500">Thumbnail</span>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                          <input type="number" step="0.01" min="0" value={clientForm.price_thumbnail} onChange={(e) => setClientForm((f) => ({ ...f, price_thumbnail: e.target.value }))} className={`${inputClass} pl-7 text-center`} />
                        </div>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-center text-xs text-slate-500">Short</span>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                          <input type="number" step="0.01" min="0" value={clientForm.price_short} onChange={(e) => setClientForm((f) => ({ ...f, price_short: e.target.value }))} className={`${inputClass} pl-7 text-center`} />
                        </div>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-center text-xs text-slate-500">Video</span>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                          <input type="number" step="0.01" min="0" value={clientForm.price_video} onChange={(e) => setClientForm((f) => ({ ...f, price_video: e.target.value }))} className={`${inputClass} pl-7 text-center`} />
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={submitting} className="mt-6 w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {submitting ? 'Creating...' : 'Create Client'}
                </button>
              </form>

              <p className="mt-4 text-center">
                <button type="button" onClick={skip} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  I'll do this later
                </button>
              </p>
            </div>
          )}

          {/* Step 3: Create Deliverable */}
          {step === 3 && (
            <div className="animate-in fade-in">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/15">
                  <FileText className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Step 2 of 2</p>
                <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Create your first deliverable</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  What are you working on for <strong className="text-slate-700 dark:text-slate-200">{createdClient?.name}</strong>?
                </p>
              </div>

              {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">{error}</div>}

              <form onSubmit={handleCreateDeliverable} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Title</span>
                    <input
                      required
                      type="text"
                      placeholder="e.g. March highlights reel"
                      value={delivForm.title}
                      onChange={(e) => setDelivForm((f) => ({ ...f, title: e.target.value }))}
                      className={inputClass}
                      autoFocus
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Type</span>
                    <select value={delivForm.type} onChange={(e) => setDelivForm((f) => ({ ...f, type: e.target.value }))} className={inputClass}>
                      <option value="short">Short</option>
                      <option value="thumbnail">Thumbnail</option>
                      <option value="video">Video</option>
                    </select>
                  </label>
                </div>

                <button type="submit" disabled={submitting} className="mt-6 w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {submitting ? 'Creating...' : 'Create Deliverable'}
                </button>
              </form>

              <p className="mt-4 text-center">
                <button type="button" onClick={skip} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  I'll do this later
                </button>
              </p>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="animate-in fade-in text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
                <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">You're all set!</h1>
              <p className="mt-3 text-base text-slate-500 dark:text-slate-400">
                Your workspace is ready to go.
              </p>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">What you created</h3>
                <div className="space-y-3">
                  {createdClient && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/15">
                        <User className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{createdClient.name}</p>
                        <p className="text-xs text-slate-400">Client</p>
                      </div>
                    </div>
                  )}
                  {createdDeliv && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/15">
                        <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{createdDeliv.title || delivForm.title}</p>
                        <p className="text-xs text-slate-400 capitalize">{createdDeliv.type || delivForm.type}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">Quick tips</h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li>Add more deliverables from the <strong className="text-slate-800 dark:text-slate-200">client page</strong></li>
                  <li>Use <strong className="text-slate-800 dark:text-slate-200">Fetch Sources</strong> to pull Twitch clips as source material</li>
                  <li>Track payments and create invoices from <strong className="text-slate-800 dark:text-slate-200">Billing</strong></li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => navigate('/dashboard', { replace: true })}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 hover:bg-violet-700 transition-colors"
              >
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
