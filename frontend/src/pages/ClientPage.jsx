import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createDeliverable, fetchClient, fetchDeliverables, fetchClientSources, syncClientSources } from '../api'

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
  const clientId = Number(id)
  const [client, setClient] = useState(null)
  const [deliverables, setDeliverables] = useState([])
  const [sources, setSources] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [form, setForm] = useState(initialDeliverable)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

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

  async function onCreateDeliverable(e) {
    e.preventDefault()
    setError(null)
    try {
      await createDeliverable({
        client_id: clientId,
        ...form,
        title: form.title.trim(),
        description: form.description.trim() || null,
        source_title: form.source_title?.trim() || null,
        source_url: form.source_url?.trim() || null,
        duration_sec: form.duration_sec != null ? Number(form.duration_sec) : null,
        price_value: form.price_mode === 'override' ? Number(form.price_value) : null,
      })
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
      setSources(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading client...</p>
  if (!client) return <p className="text-sm text-gray-500 dark:text-gray-400">Client not found.</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{client.name}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Twitch: {client.socials?.twitch || 'not set'} · <Link to="/clients" className="text-violet-600 dark:text-violet-400">Back to clients</Link>
          </p>
        </div>
      </div>
      {error ? <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">Paid</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">${totals.paid.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">Unpaid</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">${totals.unpaid.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">${totals.total.toFixed(2)}</p>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Create deliverable</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onCreateDeliverable}>
          <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700">
            <option value="short">Short</option>
            <option value="thumbnail">Thumbnail</option>
            <option value="video">Video</option>
          </select>
          <input required placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700" />
          <input placeholder="Source title" value={form.source_title} onChange={(e) => setForm((f) => ({ ...f, source_title: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700" />
          <input placeholder="Source URL" value={form.source_url} onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700" />
          <input placeholder="Duration seconds" type="number" value={form.duration_sec ?? ''} onChange={(e) => setForm((f) => ({ ...f, duration_sec: e.target.value ? Number(e.target.value) : null }))} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700" />
          <select value={form.price_mode} onChange={(e) => setForm((f) => ({ ...f, price_mode: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700">
            <option value="auto">Auto price</option>
            <option value="override">Manual override</option>
          </select>
          {form.price_mode === 'override' ? (
            <input placeholder="Manual price" type="number" step="0.01" value={form.price_value} onChange={(e) => setForm((f) => ({ ...f, price_value: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700" />
          ) : null}
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="md:col-span-2 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700" />
          <div className="md:col-span-2">
            <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">Create deliverable</button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Sources (Twitch)</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => onSyncSources(false)} disabled={syncing} className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700">
              {syncing ? 'Syncing...' : 'Sync sources'}
            </button>
            <button type="button" onClick={() => onSyncSources(true)} disabled={syncing} className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700">
              Force refresh
            </button>
          </div>
        </div>
        {sources.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No sources yet.</p> : (
          <div className="space-y-2">
            {sources.slice(0, 12).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{s.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.duration_sec ?? 0}s</p>
                </div>
                <button type="button" onClick={() => useSource(s)} className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-700">
                  Use source
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent deliverables</h2>
        {deliverables.length === 0 ? <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No deliverables yet.</p> : (
          <div className="mt-2 space-y-2">
            {deliverables.slice(0, 10).map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
                <span className="text-gray-900 dark:text-white">{d.title}</span>
                <span className="text-gray-500 dark:text-gray-400">{d.status} · ${Number(d.price_value || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
