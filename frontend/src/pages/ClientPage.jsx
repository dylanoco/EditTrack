import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { X } from 'lucide-react'
import { createDeliverable, fetchClient, fetchDeliverables, fetchClientSources, syncClientSources } from '../api'
import { EditClientModal } from '../components/EditClientModal'
import { SourceCardGrid } from '../components/SourceCardGrid'
import { useNotifications } from '../contexts/NotificationsContext'

const initialDeliverable = {
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

export function ClientPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addNotification } = useNotifications()
  const clientId = Number(id)
  const [client, setClient] = useState(null)
  const [deliverables, setDeliverables] = useState([])
  const [sources, setSources] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [form, setForm] = useState(initialDeliverable)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editClientModalOpen, setEditClientModalOpen] = useState(false)
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const [c, ds, ss] = await Promise.all([
        fetchClient(clientId),
        fetchDeliverables({ client_id: clientId }),
        fetchClientSources(clientId),
      ])
      setClient(c)
      setDeliverables(ds)
      setSources(ss)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (Number.isFinite(clientId)) refresh()
  }, [clientId])

  const totals = useMemo(() => {
    const paid = deliverables.filter((d) => d.payment_status === 'paid').reduce((sum, d) => sum + Number(d.price_value || 0), 0)
    const unpaid = deliverables.filter((d) => d.payment_status !== 'paid').reduce((sum, d) => sum + Number(d.price_value || 0), 0)
    return { paid, unpaid, total: paid + unpaid }
  }, [deliverables])

  function useSource(src) {
    setForm((f) => ({
      ...f,
      source_id: src.id,
      source_title: src.title || '',
      duration_sec: src.duration_sec ?? null,
      source_url: src.url || '',
      title: src.title || f.title,
    }))
  }

  function openSourcesModal() {
    setSourcesModalOpen(true)
    if (sources.length === 0) onSyncSources(false)
  }

  function useSourceAndClose(src) {
    useSource(src)
    setSourcesModalOpen(false)
  }

  function createDeliverableFromSource(src) {
    navigate('/deliverables/create', { state: { source: src, clientId } })
  }

  async function onCreateDeliverable(e) {
    e.preventDefault()
    setError(null)
    try {
      const payload = {
        client_id: clientId,
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
      if (payload.price_mode === 'override' && form.price_value) {
        payload.price_value = Number(form.price_value)
      }
      await createDeliverable(payload)
      addNotification({ type: 'success', title: 'Deliverable created', message: form.title?.trim() || 'New deliverable' })
      setForm(initialDeliverable)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function onSyncSources(force = false) {
    setSyncing(true)
    setError(null)
    try {
      const rows = await syncClientSources(clientId, 'twitch', force)
      addNotification({ type: 'success', title: 'Sources synced', message: `Fetched ${rows.length} Twitch clip(s)` })
      setSources(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading client...</p>
  if (!client) return <p className="text-sm text-gray-500 dark:text-gray-400">Client not found.</p>

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{client.name}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            <Link to="/clients" className="text-violet-600 dark:text-violet-400">Back to clients</Link>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditClientModalOpen(true)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          Edit client
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Paid: <strong className="text-green-600 dark:text-green-400">${totals.paid.toFixed(2)}</strong>
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Unpaid: <strong className="text-amber-600 dark:text-amber-400">${totals.unpaid.toFixed(2)}</strong>
        </span>
      </div>

      <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Create deliverable</h2>
        <form onSubmit={onCreateDeliverable} className="space-y-6">
          <div className="space-y-4">
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
                  />
                </label>
              ) : null}
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700"
          >
            Create deliverable
          </button>
        </form>

        <div className="border-t border-gray-200 pt-6 mt-6 dark:border-gray-700">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Sources (Twitch)</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onSyncSources(false)}
                disabled={syncing}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                {syncing ? 'Syncing…' : 'Fetch sources'}
              </button>
              <button
                type="button"
                onClick={() => onSyncSources(true)}
                disabled={syncing}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Force refresh
              </button>
            </div>
          </div>
          {sources.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No sources yet.</p>
          ) : (
            <SourceCardGrid sources={sources} onUseSource={useSource} onOpenVideo={null} columns={3} />
          )}
        </div>

        <div className="border-t border-gray-200 pt-6 mt-6 dark:border-gray-700">
          <h2 className="mb-4 text-base font-bold text-gray-900 dark:text-white">Recent deliverables</h2>
          {deliverables.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No deliverables yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {deliverables.slice(0, 10).map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 dark:text-white">{d.title || 'Untitled'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 capitalize">{d.status}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                        {d.price_value != null ? `$${Number(d.price_value).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {d.source_url ? (
                          <a
                            href={d.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-600 hover:text-violet-700 text-sm font-medium"
                          >
                            Open source
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
                  onClick={() => onSyncSources(false)}
                  disabled={syncing}
                  className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {syncing ? 'Fetching…' : 'Fetch sources'}
                </button>
                <button
                  type="button"
                  onClick={() => onSyncSources(true)}
                  disabled={syncing}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Force refresh
                </button>
              </div>
              {syncing && sources.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Fetching sources…</p>
              ) : sources.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No sources found. Try force refresh.</p>
              ) : (
                <SourceCardGrid sources={sources} onUseSource={useSourceAndClose} columns={3} />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {editClientModalOpen && client ? (
        <EditClientModal
          client={client}
          onSave={() => refresh()}
          onClose={() => setEditClientModalOpen(false)}
        />
      ) : null}
    </div>
  )
}
