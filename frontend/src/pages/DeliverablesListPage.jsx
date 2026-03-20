import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchClients,
  fetchDeliverables,
  updateDeliverable,
} from '../api'
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

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white'
  const tableHeader =
    'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400'
  const tableCell = 'px-4 py-3 text-sm text-gray-900 dark:text-gray-100'

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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">Paid total</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">${totals.paid.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">Unpaid total</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">${totals.unpaid.toFixed(2)}</p>
        </div>
      </div>

      {editingId ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Edit deliverable</h2>
          <form onSubmit={onUpdate} className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Client</span>
              <select
                value={editForm.client_id}
                onChange={(e) => setEditForm((f) => ({ ...f, client_id: e.target.value }))}
                className={inputClass}
              >
                {[...clients, ...archivedClients].map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Type</span>
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
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Title</span>
              <input
                required
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Source URL</span>
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
            <label>
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                className={inputClass}
              >
                <option value="incomplete">Incomplete</option>
                <option value="complete">Complete</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Payment</span>
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
            <label>
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Pricing</span>
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
              <label>
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Manual price ($)</span>
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
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
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
                  <th className={tableHeader}>Status</th>
                  <th className={tableHeader}>Payment</th>
                  <th className={tableHeader}>Price</th>
                  <th className={tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {deliverables.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-6 text-center text-sm text-gray-500">
                      No deliverables yet.
                    </td>
                  </tr>
                ) : (
                  deliverables.map((d) => {
                    const c = clientById.get(String(d.client_id))
                    return (
                      <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className={tableCell}>{d.title}</td>
                        <td className={tableCell}>{c ? c.name : `#${d.client_id}`}</td>
                        <td className={tableCell}><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-700">{d.type}</span></td>
                        <td className={tableCell}>{d.status}</td>
                        <td className={tableCell}>{d.payment_status || 'unpaid'}</td>
                        <td className={tableCell}>{d.price_value != null ? `$${Number(d.price_value).toFixed(2)}` : '—'}</td>
                        <td className={tableCell}>
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
                          <button
                            type="button"
                            onClick={() => openEdit(d)}
                            className="ml-3 text-violet-600 hover:text-violet-700 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => archive(d.id)}
                            className="ml-3 text-gray-500 hover:text-gray-700 text-sm"
                          >
                            Archive
                          </button>
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
                  return (
                    <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className={tableCell}>{d.title}</td>
                      <td className={tableCell}>{c ? c.name : `#${d.client_id}`}</td>
                      <td className={tableCell}>{d.type}</td>
                      <td className={tableCell}>{d.payment_status || 'unpaid'}</td>
                      <td className={tableCell}>{d.price_value != null ? `$${Number(d.price_value).toFixed(2)}` : '—'}</td>
                      <td className={tableCell}>
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
                        <button
                          type="button"
                          onClick={() => restore(d.id)}
                          className="ml-3 text-violet-600 hover:text-violet-700 text-sm font-medium"
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
