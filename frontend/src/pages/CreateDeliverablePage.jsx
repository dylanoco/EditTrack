import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { createDeliverable, fetchClients, syncClientSources } from '../api'
import { SourceCardGrid } from '../components/SourceCardGrid'
import { useNotifications } from '../contexts/NotificationsContext'

const initialForm = {
  client_id: '',
  type: 'short',
  title: '',
  description: '',
  source_id: null,
  source_title: '',
  duration_sec: null,
  source_url: '',
  status: 'incomplete',
  price_mode: 'auto',
  price_value: '',
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

  // Prefill from navigation state (e.g. from "Create deliverable" on source card)
  useEffect(() => {
    const state = location.state
    if (state?.source && state?.clientId) {
      const s = state.source
      setForm((f) => ({
        ...f,
        client_id: String(state.clientId),
        source_id: s.id ?? null,
        source_title: s.title ?? '',
        duration_sec: s.duration_sec ?? null,
        source_url: s.url ?? '',
        title: s.title?.trim() || f.title,
      }))
    }
  }, [location.state])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const rows = await fetchClients()
        if (!cancelled) setClients(rows)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function fetchSources(force = false) {
    if (!form.client_id) {
      setError('Select a client first')
      return
    }
    setError(null)
    setSourcesLoading(true)
    try {
      const list = await syncClientSources(Number(form.client_id), 'twitch', force)
      addNotification({ type: 'success', title: 'Sources synced', message: `Fetched ${list.length} Twitch clip(s)` })
      setSources(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSources([])
    } finally {
      setSourcesLoading(false)
    }
  }

  function openSourcesModal() {
    if (!form.client_id) {
      setError('Select a client first')
      return
    }
    setError(null)
    setSourcesModalOpen(true)
    if (sources.length === 0) fetchSources(false)
  }

  function useSource(s) {
    setForm((f) => ({
      ...f,
      source_id: s.id ?? null,
      source_title: s.title ?? '',
      duration_sec: s.duration_sec ?? null,
      source_url: s.url ?? '',
      title: s.title?.trim() || f.title,
    }))
    setSourcesModalOpen(false)
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        client_id: Number(form.client_id),
        type: form.type,
        title: form.title.trim(),
        description: form.description?.trim() || null,
        source_id: form.source_id != null ? Number(form.source_id) : null,
        source_title: form.source_title?.trim() || null,
        duration_sec: form.duration_sec != null ? Number(form.duration_sec) : null,
        source_url: form.source_url?.trim() || null,
        status: form.status,
        price_mode: form.price_mode,
      }
      if (!payload.client_id) throw new Error('Client is required')
      if (!payload.title) throw new Error('Deliverable title is required')
      if (payload.price_mode === 'override') {
        const val = form.price_value
        if (val === '' || val == null) throw new Error('Manual price is required when using override pricing')
        payload.price_value = Number(val)
      }

      await createDeliverable(payload)
      addNotification({ type: 'success', title: 'Deliverable created', message: payload.title || 'New deliverable' })
      navigate('/deliverables')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400'

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        <Link to="/deliverables" className="text-violet-600 hover:text-violet-700 dark:text-violet-400">
          Back to deliverables
        </Link>
      </p>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <form onSubmit={onSubmit} className="space-y-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Create a Deliverable</h1>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Client</span>
              <select
                required
                value={form.client_id}
                onChange={(e) => {
                  setForm((f) => ({ ...f, client_id: e.target.value }))
                  setSources([])
                }}
                className={inputClass}
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Type</span>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className={inputClass}
              >
                <option value="short">Short</option>
                <option value="thumbnail">Thumbnail</option>
                <option value="video">Video</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Title</span>
              <input
                required
                type="text"
                placeholder="e.g. Clip highlights #12"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
              <input
                type="text"
                placeholder="Optional"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Source URL</span>
              <input
                type="url"
                placeholder="VoD or clip URL (optional)"
                value={form.source_url}
                onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
                className={inputClass}
              />
            </label>
          </div>

          <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
            <h2 className="mb-4 text-base font-bold text-gray-900 dark:text-white">Sources</h2>
            <button
              type="button"
              onClick={openSourcesModal}
              disabled={!form.client_id}
              className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Fetch sources
            </button>
          </div>

          <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
            <h2 className="mb-4 text-base font-bold text-gray-900 dark:text-white">Pricing</h2>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Price mode</span>
                  <select
                    value={form.price_mode}
                    onChange={(e) => setForm((f) => ({ ...f, price_mode: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="auto">Auto (client rate)</option>
                    <option value="override">Override (manual)</option>
                  </select>
                </label>
                {form.price_mode === 'override' ? (
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Manual price ($)</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price_value}
                      onChange={(e) => setForm((f) => ({ ...f, price_value: e.target.value }))}
                      className={inputClass}
                      required={form.price_mode === 'override'}
                    />
                  </label>
                ) : null}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-800"
            >
              {submitting ? 'Creating…' : 'Create Deliverable'}
            </button>
          </form>
      </div>

      {sourcesModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          style={{ left: 'var(--sidebar-width, 17.5rem)' }}
          onClick={() => setSourcesModalOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Select source</h2>
              <button
                type="button"
                onClick={() => setSourcesModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fetchSources(false)}
                  disabled={sourcesLoading}
                  className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {sourcesLoading ? 'Fetching…' : 'Fetch sources'}
                </button>
                <button
                  type="button"
                  onClick={() => fetchSources(true)}
                  disabled={sourcesLoading}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Force refresh
                </button>
              </div>
              {sourcesLoading && sources.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Fetching sources…</p>
              ) : sources.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No sources found. Try force refresh.</p>
              ) : (
                <SourceCardGrid sources={sources} onUseSource={useSource} columns={3} />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
