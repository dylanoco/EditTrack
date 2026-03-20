import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
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

  function useSource(s) {
    setForm((f) => ({
      ...f,
      source_id: s.id ?? null,
      source_title: s.title ?? '',
      duration_sec: s.duration_sec ?? null,
      source_url: s.url ?? '',
      title: s.title?.trim() || f.title,
    }))
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
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Create Deliverable</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            <Link to="/deliverables" className="text-violet-600 hover:text-violet-700 dark:text-violet-400">
              Back to deliverables
            </Link>
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <form onSubmit={onSubmit} className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>

          {form.client_id ? (
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Sources</h2>
              <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                Fetch Twitch clips for the selected client, then pick one to prefill the form.
              </p>
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => fetchSources(false)}
                  disabled={sourcesLoading}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {sourcesLoading ? 'Fetching…' : 'Fetch sources'}
                </button>
                <button
                  type="button"
                  onClick={() => fetchSources(true)}
                  disabled={sourcesLoading}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Force refresh
                </button>
              </div>
              <SourceCardGrid sources={sources} onUseSource={useSource} />
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
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
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
              <input
                type="text"
                placeholder="Optional"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Source URL</span>
              <input
                type="url"
                placeholder="VoD or clip URL (optional)"
                value={form.source_url}
                onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Pricing</span>
              <select
                value={form.price_mode}
                onChange={(e) => setForm((f) => ({ ...f, price_mode: e.target.value }))}
                className={inputClass}
              >
                <option value="auto">Auto (client rate)</option>
                <option value="override">Override (manual $)</option>
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

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create deliverable'}
            </button>
            <Link
              to="/deliverables"
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
