import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, X } from 'lucide-react'
import {
  fetchClients,
  fetchDeliverables,
  syncClientSources,
  updateDeliverable,
} from '../api'
import { SourceCardGrid } from '../components/SourceCardGrid'
import { useNotifications } from '../contexts/NotificationsContext'

const initialEditForm = {
  client_id: '',
  type: 'short',
  title: '',
  description: '',
  source_id: null,
  source_title: '',
  duration_sec: null,
  source_url: '',
  status: 'incomplete',
  payment_status: 'unpaid',
  price_mode: 'auto',
  price_value: '',
}

export function DeliverablesListPage() {
  const { addNotification } = useNotifications()
  const [clients, setClients] = useState([])
  const [archivedClients, setArchivedClients] = useState([])
  const [deliverables, setDeliverables] = useState([])
  const [archivedDeliverables, setArchivedDeliverables] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(initialEditForm)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterPayment, setFilterPayment] = useState('all')
  const [filterClient, setFilterClient] = useState('')
  const [filterType, setFilterType] = useState('')
  const [sources, setSources] = useState([])
  const [sourcesLoading, setSourcesLoading] = useState(false)
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false)

  const clientById = useMemo(() => {
    const m = new Map()
    for (const c of [...clients, ...archivedClients]) m.set(String(c.id), c)
    return m
  }, [clients, archivedClients])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const [c, ac, d, ad] = await Promise.all([
        fetchClients(),
        fetchClients({ archived: true }),
        fetchDeliverables(),
        fetchDeliverables({ archived: true }),
      ])
      setClients(c)
      setArchivedClients(ac)
      setDeliverables(d)
      setArchivedDeliverables(ad)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  function openEdit(d) {
    setEditingId(d.id)
    setSources([])
    setEditForm({
      client_id: String(d.client_id),
      type: d.type ?? 'short',
      title: d.title ?? '',
      description: d.description ?? '',
      source_id: d.source_id ?? null,
      source_title: d.source_title ?? '',
      duration_sec: d.duration_sec ?? null,
      source_url: d.source_url ?? '',
      status: d.status ?? 'incomplete',
      payment_status: d.payment_status ?? 'unpaid',
      price_mode: d.price_mode ?? 'auto',
      price_value: d.price_value != null ? String(d.price_value) : '',
    })
  }

  async function fetchSourcesForEdit(force = false) {
    if (!editForm.client_id) return
    setSourcesLoading(true)
    try {
      const list = await syncClientSources(Number(editForm.client_id), 'twitch', force)
      addNotification({ type: 'success', title: 'Sources synced', message: `Fetched ${list.length} Twitch clip(s)` })
      setSources(list)
    } catch (e) {
      setSources([])
    } finally {
      setSourcesLoading(false)
    }
  }

  function openSourcesModal() {
    if (!editForm.client_id) return
    setSourcesModalOpen(true)
    if (sources.length === 0) fetchSourcesForEdit(false)
  }

  function useSource(s) {
    setEditForm((f) => ({
      ...f,
      source_id: s.id ?? null,
      source_title: s.title ?? '',
      duration_sec: s.duration_sec ?? null,
      source_url: s.url ?? '',
      title: s.title?.trim() || f.title,
    }))
    setSourcesModalOpen(false)
  }

  async function onUpdate(e) {
    e.preventDefault()
    if (!editingId) return
    setError(null)
    try {
      const payload = {
        client_id: Number(editForm.client_id),
        type: editForm.type,
        title: editForm.title.trim(),
        description: editForm.description?.trim() || null,
        source_id: editForm.source_id != null ? Number(editForm.source_id) : null,
        source_title: editForm.source_title?.trim() || null,
        duration_sec: editForm.duration_sec != null ? Number(editForm.duration_sec) : null,
        source_url: editForm.source_url?.trim() || null,
        status: editForm.status,
        payment_status: editForm.payment_status ?? 'unpaid',
        price_mode: editForm.price_mode,
      }
      if (payload.price_mode === 'override') {
        const val = editForm.price_value
        if (val === '' || val == null) throw new Error('Manual price required when using override')
        payload.price_value = Number(val)
      }
      await updateDeliverable(editingId, payload)
      if (payload.payment_status === 'paid') {
        addNotification({ type: 'success', title: 'Deliverable marked paid', message: payload.title || 'Payment recorded' })
      }
      await refresh()
      setEditingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function archive(id) {
    setError(null)
    try {
      await updateDeliverable(id, { archived: true })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function restore(id) {
    setError(null)
    try {
      await updateDeliverable(id, { archived: false })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const totals = useMemo(() => {
    const paid = deliverables.filter((d) => d.payment_status === 'paid').reduce((s, d) => s + Number(d.price_value || 0), 0)
    const unpaid = deliverables.filter((d) => d.payment_status !== 'paid').reduce((s, d) => s + Number(d.price_value || 0), 0)
    return { paid, unpaid }
  }, [deliverables])

  const filteredDeliverables = useMemo(() => {
    return deliverables.filter((d) => {
      if (filterPayment === 'paid' && d.payment_status !== 'paid') return false
      if (filterPayment === 'unpaid' && d.payment_status === 'paid') return false
      if (filterClient && String(d.client_id) !== filterClient) return false
      if (filterType && d.type !== filterType) return false
      return true
    })
  }, [deliverables, filterPayment, filterClient, filterType])

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white'
  const tableHeader =
    'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Deliverables</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage and edit deliverables.</p>
        </div>
        <Link
          to="/deliverables/create"
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          Create deliverable
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Paid: <strong className="text-green-600 dark:text-green-400">${totals.paid.toFixed(2)}</strong>
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Unpaid: <strong className="text-amber-600 dark:text-amber-400">${totals.unpaid.toFixed(2)}</strong>
          </span>
        </div>
        <div className="flex flex-nowrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50/50 p-0.5 dark:border-gray-600 dark:bg-gray-800/50">
            {(['all', 'paid', 'unpaid']).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setFilterPayment(v)}
                className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  filterPayment === v
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Client</option>
            {clients.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Type</option>
            <option value="short">Short</option>
            <option value="thumbnail">Thumbnail</option>
            <option value="video">Video</option>
          </select>
        </div>
      </div>

      {editingId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          style={{ left: 'var(--sidebar-width, 17.5rem)' }}
          onClick={() => setEditingId(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit deliverable</h2>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={onUpdate} className="max-h-[calc(90vh-140px)] overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Client</span>
                  <select
                    value={editForm.client_id}
                    onChange={(e) => {
                      setEditForm((f) => ({ ...f, client_id: e.target.value }))
                      setSources([])
                    }}
                    className={inputClass}
                  >
                    {[...clients, ...archivedClients].map((c) => (
                      <option key={c.id} value={String(c.id)}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Type</span>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
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
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
                  <input
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Optional"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Source URL</span>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={editForm.source_url}
                      onChange={(e) => setEditForm((f) => ({ ...f, source_url: e.target.value }))}
                      placeholder="https://..."
                      className={inputClass}
                    />
                    {editForm.source_url ? (
                      <a
                        href={editForm.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                      >
                        Open
                      </a>
                    ) : null}
                  </div>
                </label>
              </div>

              <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                <h2 className="mb-4 text-base font-bold text-gray-900 dark:text-white">Sources</h2>
                <button
                  type="button"
                  onClick={openSourcesModal}
                  disabled={!editForm.client_id}
                  className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Fetch sources
                </button>
              </div>

              <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                <h2 className="mb-4 text-base font-bold text-gray-900 dark:text-white">Status & Pricing</h2>
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="incomplete">Incomplete</option>
                      <option value="complete">Complete</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Payment</span>
                    <select
                      value={editForm.payment_status}
                      onChange={(e) => setEditForm((f) => ({ ...f, payment_status: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="partial">Partial</option>
                      <option value="paid">Paid</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Price mode</span>
                    <select
                      value={editForm.price_mode}
                      onChange={(e) => setEditForm((f) => ({ ...f, price_mode: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="auto">Auto</option>
                      <option value="override">Override</option>
                    </select>
                  </label>
                  {editForm.price_mode === 'override' && (
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Manual price ($)</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.price_value}
                        onChange={(e) => setEditForm((f) => ({ ...f, price_value: e.target.value }))}
                        className={inputClass}
                      />
                    </label>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700"
              >
                Save
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {sourcesModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
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
                  onClick={() => fetchSourcesForEdit(false)}
                  disabled={sourcesLoading}
                  className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {sourcesLoading ? 'Fetching…' : 'Fetch sources'}
                </button>
                <button
                  type="button"
                  onClick={() => fetchSourcesForEdit(true)}
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

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading…</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className={tableHeader}>Title</th>
                  <th className={tableHeader}>Client</th>
                  <th className={tableHeader}>Type</th>
                  <th className={tableHeader}>Payment</th>
                  <th className={tableHeader}>Price</th>
                  <th className={tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {filteredDeliverables.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-sm text-gray-500">
                      {deliverables.length === 0 ? 'No deliverables yet.' : 'No deliverables match filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredDeliverables.map((d) => {
                    const c = clientById.get(String(d.client_id))
                    const payment = d.payment_status || 'unpaid'
                    const typeColors = {
                      short: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
                      thumbnail: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                      video: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
                    }
                    const typeClass = typeColors[d.type] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    const paymentClass =
                      payment === 'paid'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400'
                        : payment === 'partial'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                    return (
                      <tr
                        key={d.id}
                        onClick={() => openEdit(d)}
                        className="cursor-pointer transition-colors hover:bg-violet-50 dark:hover:bg-violet-900/15"
                      >
                        <td className="px-4 py-3.5">
                          <span className="text-base font-semibold text-gray-900 dark:text-white">{d.title || 'Untitled'}</span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-400 dark:text-gray-500">
                          {c ? c.name : `#${d.client_id}`}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize opacity-90 ${typeClass}`}>
                            {d.type || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${paymentClass}`}>
                            {payment === 'paid' ? '✓ Paid' : payment === 'partial' ? 'Partial' : 'Unpaid'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm font-semibold text-gray-900 dark:text-white">
                          {d.price_value != null ? `$${Number(d.price_value).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            {d.source_url ? (
                              <a
                                href={d.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-violet-600 dark:hover:bg-gray-700 dark:hover:text-violet-400"
                                title="Open source"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => openEdit(d)}
                              className="rounded bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => archive(d.id)}
                              className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:text-gray-400 dark:hover:bg-gray-700"
                            >
                              Archive
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {archivedDeliverables.length > 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-gray-700 dark:bg-gray-800">
          <h2 className="px-6 py-4 text-lg font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
            Archived deliverables
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className={tableHeader}>Title</th>
                  <th className={tableHeader}>Client</th>
                  <th className={tableHeader}>Type</th>
                  <th className={tableHeader}>Payment</th>
                  <th className={tableHeader}>Price</th>
                  <th className={tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {archivedDeliverables.map((d) => {
                  const c = clientById.get(String(d.client_id))
                  const payment = d.payment_status || 'unpaid'
                  const typeColors = {
                    short: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
                    thumbnail: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                    video: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
                  }
                  const typeClass = typeColors[d.type] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  const paymentClass =
                    payment === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : payment === 'partial' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  return (
                    <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-gray-900 dark:text-white">{d.title || 'Untitled'}</span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">{c ? c.name : `#${d.client_id}`}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${typeClass}`}>{d.type || '—'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${paymentClass}`}>
                          {payment === 'paid' ? 'Paid ✓' : payment === 'partial' ? 'Partial' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-gray-900 dark:text-white">
                        {d.price_value != null ? `$${Number(d.price_value).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => restore(d.id)}
                          className="rounded bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-700"
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
