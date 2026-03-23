import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, X } from 'lucide-react'
import { createDeliverable, fetchClients, syncClientSources } from '../api'
import { SourceCardGrid } from '../components/SourceCardGrid'
import { useNotifications } from '../contexts/NotificationsContext'
import { InfoTip } from '../components/Tooltip'

const initialForm = {
  client_id: '', type: 'short', title: '', description: '', source_id: null,
  source_title: '', duration_sec: null, source_url: '', status: 'incomplete',
  price_mode: 'auto', price_value: '',
}

export function CreateDeliverablePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { addNotification } = useNotifications()
  const [clients, setClients] = useState([])
  const [form, setForm] = useState(initialForm)
  const [sources, setSources] = useState([])
  const [sourcesLoading, setSourcesLoading] = useState(false)
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const state = location.state
    if (state?.source && state?.clientId) {
      const s = state.source
      setForm((f) => ({ ...f, client_id: String(state.clientId), source_id: s.id ?? null, source_title: s.title ?? '', duration_sec: s.duration_sec ?? null, source_url: s.url ?? '', title: s.title?.trim() || f.title }))
    }
  }, [location.state])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try { const rows = await fetchClients(); if (!cancelled) setClients(rows) }
      catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function fetchSources(force = false) {
    if (!form.client_id) { setError('Select a client first'); return }
    setError(null); setSourcesLoading(true)
    try {
      const list = await syncClientSources(Number(form.client_id), 'twitch', force)
      addNotification({ type: 'success', title: 'Sources synced', message: `Fetched ${list.length} Twitch clip(s)` })
      setSources(list)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); setSources([]) } finally { setSourcesLoading(false) }
  }

  function openSourcesModal() {
    if (!form.client_id) { setError('Select a client first'); return }
    setError(null); setSourcesModalOpen(true)
    if (sources.length === 0) fetchSources(false)
  }

  function useSource(s) {
    setForm((f) => ({ ...f, source_id: s.id ?? null, source_title: s.title ?? '', duration_sec: s.duration_sec ?? null, source_url: s.url ?? '', title: s.title?.trim() || f.title }))
    setSourcesModalOpen(false)
  }

  async function onSubmit(e) {
    e.preventDefault(); setError(null); setSubmitting(true)
    try {
      const payload = { client_id: Number(form.client_id), type: form.type, title: form.title.trim(), description: form.description?.trim() || null, source_id: form.source_id != null ? Number(form.source_id) : null, source_title: form.source_title?.trim() || null, duration_sec: form.duration_sec != null ? Number(form.duration_sec) : null, source_url: form.source_url?.trim() || null, status: form.status, price_mode: form.price_mode }
      if (!payload.client_id) throw new Error('Client is required')
      if (!payload.title) throw new Error('Deliverable title is required')
      if (payload.price_mode === 'override') {
        if (form.price_value === '' || form.price_value == null) throw new Error('Manual price is required when using override pricing')
        payload.price_value = Number(form.price_value)
      }
      await createDeliverable(payload)
      addNotification({ type: 'success', title: 'Deliverable created', message: payload.title || 'New deliverable' })
      navigate('/deliverables')
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setSubmitting(false) }
  }

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500'

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link to="/deliverables" className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400">
        <ArrowLeft className="h-4 w-4" /> Back to deliverables
      </Link>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">{error}</div>}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={onSubmit} className="space-y-6">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Create a Deliverable</h1>
          <div className="space-y-4">
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Client</span><select required value={form.client_id} onChange={(e) => { setForm((f) => ({ ...f, client_id: e.target.value })); setSources([]) }} className={inputClass}><option value="">Select client...</option>{clients.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}</select></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Type</span><select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={inputClass}><option value="short">Short</option><option value="thumbnail">Thumbnail</option><option value="video">Video</option></select></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Title</span><input required type="text" placeholder="e.g. Clip highlights #12" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputClass} /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</span><input type="text" placeholder="Optional" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputClass} /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Source URL</span><input type="url" placeholder="VoD or clip URL (optional)" value={form.source_url} onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))} className={inputClass} /></label>
          </div>
          <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
            <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Sources<InfoTip content="Pull recent Twitch clips for the selected client. Choose a clip to auto-fill title & source URL." /></h2>
            <button type="button" onClick={openSourcesModal} disabled={!form.client_id} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed">Fetch sources</button>
          </div>
          <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
            <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Pricing</h2>
            <div className="space-y-4">
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Price mode<InfoTip content="Auto uses the client's per-type rate. Override lets you set a custom price for this deliverable." /></span><select value={form.price_mode} onChange={(e) => setForm((f) => ({ ...f, price_mode: e.target.value }))} className={inputClass}><option value="auto">Auto (client rate)</option><option value="override">Override (manual)</option></select></label>
              {form.price_mode === 'override' && <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Manual price ($)</span><input type="number" step="0.01" min="0" value={form.price_value} onChange={(e) => setForm((f) => ({ ...f, price_value: e.target.value }))} className={inputClass} required /></label>}
            </div>
          </div>
          <button type="submit" disabled={submitting} className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50">{submitting ? 'Creating...' : 'Create Deliverable'}</button>
        </form>
      </div>

      {sourcesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSourcesModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Select source</h2>
              <button type="button" onClick={() => setSourcesModalOpen(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
              <div className="mb-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => fetchSources(false)} disabled={sourcesLoading} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">{sourcesLoading ? 'Fetching...' : 'Fetch sources'}</button>
                <button type="button" onClick={() => fetchSources(true)} disabled={sourcesLoading} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Force refresh</button>
              </div>
              {sourcesLoading && sources.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">Fetching sources...</p>
                : sources.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No sources found. Try force refresh.</p>
                : <SourceCardGrid sources={sources} onUseSource={useSource} columns={3} />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
