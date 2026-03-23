import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, X } from 'lucide-react'
import { createDeliverable, fetchClient, fetchDeliverables, fetchClientSources, syncClientSources } from '../api'
import { EditClientModal } from '../components/EditClientModal'
import { SourceCardGrid } from '../components/SourceCardGrid'
import { useNotifications } from '../contexts/NotificationsContext'
import { InfoTip } from '../components/Tooltip'

const initialDeliverable = {
  type: 'short', title: '', description: '', source_id: null, source_title: '',
  duration_sec: null, source_url: '', status: 'incomplete', price_mode: 'auto', price_value: '',
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
  const [sourceType, setSourceType] = useState('clips')
  const [sourceSort, setSourceSort] = useState('newest')
  const [form, setForm] = useState(initialDeliverable)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editClientModalOpen, setEditClientModalOpen] = useState(false)
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false)

  async function refresh() {
    setLoading(true); setError(null)
    try {
      const [c, ds, ss] = await Promise.all([fetchClient(clientId), fetchDeliverables({ client_id: clientId }), fetchClientSources(clientId)])
      setClient(c); setDeliverables(ds); setSources(ss)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setLoading(false) }
  }

  useEffect(() => { if (Number.isFinite(clientId)) refresh() }, [clientId])

  const totals = useMemo(() => {
    const paid = deliverables.filter((d) => d.payment_status === 'paid').reduce((s, d) => s + Number(d.price_value || 0), 0)
    const unpaid = deliverables.filter((d) => d.payment_status !== 'paid').reduce((s, d) => s + Number(d.price_value || 0), 0)
    return { paid, unpaid }
  }, [deliverables])

  function useSource(src) {
    setForm((f) => ({ ...f, source_id: src.id, source_title: src.title || '', duration_sec: src.duration_sec ?? null, source_url: src.url || '', title: src.title || f.title }))
  }
  function openSourcesModal() { setSourcesModalOpen(true); if (sources.length === 0) onSyncSources(false) }
  function useSourceAndClose(src) { useSource(src); setSourcesModalOpen(false) }

  async function onCreateDeliverable(e) {
    e.preventDefault(); setError(null)
    try {
      const payload = { client_id: clientId, type: form.type, title: form.title.trim(), description: form.description?.trim() || null, source_id: form.source_id != null ? Number(form.source_id) : null, source_title: form.source_title?.trim() || null, duration_sec: form.duration_sec != null ? Number(form.duration_sec) : null, source_url: form.source_url?.trim() || null, status: form.status, price_mode: form.price_mode }
      if (payload.price_mode === 'override' && form.price_value) payload.price_value = Number(form.price_value)
      await createDeliverable(payload)
      addNotification({ type: 'success', title: 'Deliverable created', message: form.title?.trim() || 'New deliverable' })
      setForm(initialDeliverable); refresh()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }

  async function onSyncSources(force = false) {
    setSyncing(true); setError(null)
    try {
      const rows = await syncClientSources(clientId, 'twitch', force, sourceType)
      const label = sourceType === 'vods' ? 'VOD(s)' : 'clip(s)'
      addNotification({ type: 'success', title: 'Sources synced', message: `Fetched ${rows.length} Twitch ${label}` })
      setSources(rows)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setSyncing(false) }
  }

  const sortedSources = useMemo(() => {
    const copy = [...sources]
    copy.sort((a, b) => {
      const aTime = new Date(a.fetched_at || a.created_at || 0).getTime()
      const bTime = new Date(b.fetched_at || b.created_at || 0).getTime()
      return sourceSort === 'oldest' ? aTime - bTime : bTime - aTime
    })
    return copy
  }, [sources, sourceSort])

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>
  if (!client) return <p className="text-sm text-slate-500">Client not found.</p>

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500'
  const card = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/clients" className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to clients
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{client.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link to={`/billing?client_id=${clientId}`} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
            Create invoice
          </Link>
          <button type="button" onClick={() => setEditClientModalOpen(true)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
            Edit client
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">{error}</div>}

      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-500">Paid: <strong className="text-emerald-600 dark:text-emerald-400">${totals.paid.toFixed(2)}</strong></span>
        <span className="text-sm text-slate-500">Unpaid: <strong className="text-amber-600 dark:text-amber-400">${totals.unpaid.toFixed(2)}</strong></span>
      </div>

      <div className={`mx-auto max-w-xl ${card}`} data-tour="create-deliverable">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Create deliverable</h2>
        <form onSubmit={onCreateDeliverable} className="space-y-6">
          <div className="space-y-4">
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Type</span><select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={inputClass}><option value="short">Short</option><option value="thumbnail">Thumbnail</option><option value="video">Video</option></select></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Title</span><input required type="text" placeholder="e.g. Clip highlights #12" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={inputClass} /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</span><input type="text" placeholder="Optional" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputClass} /></label>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Source URL</span><input type="url" placeholder="VoD or clip URL (optional)" value={form.source_url} onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))} className={inputClass} /></label>
          </div>
          <div className="border-t border-slate-200 pt-6 dark:border-slate-800" data-tour="fetch-sources">
            <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Sources<InfoTip content="Pull recent Twitch clips for this client. Select one to auto-fill the deliverable's source details." /></h2>
            <button type="button" onClick={openSourcesModal} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700">Fetch sources</button>
          </div>
          <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
            <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Pricing</h2>
            <div className="space-y-4">
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Price mode<InfoTip content="Auto uses the client's per-type rate. Override lets you set a custom price." /></span><select value={form.price_mode} onChange={(e) => setForm((f) => ({ ...f, price_mode: e.target.value }))} className={inputClass}><option value="auto">Auto (client rate)</option><option value="override">Override (manual)</option></select></label>
              {form.price_mode === 'override' && <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Manual price ($)</span><input type="number" step="0.01" min="0" value={form.price_value} onChange={(e) => setForm((f) => ({ ...f, price_value: e.target.value }))} className={inputClass} /></label>}
            </div>
          </div>
          <button type="submit" className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-violet-700">Create deliverable</button>
        </form>
      </div>

      {/* Recent deliverables table */}
      {deliverables.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent deliverables</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400"></th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {deliverables.slice(0, 10).map((d) => (
                  <tr key={d.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-3.5"><span className="font-medium text-slate-900 dark:text-white">{d.title || 'Untitled'}</span></td>
                    <td className="px-6 py-3.5 text-sm capitalize text-slate-500">{d.status}</td>
                    <td className="px-6 py-3.5 text-sm font-semibold text-slate-900 dark:text-white">{d.price_value != null ? `$${Number(d.price_value).toFixed(2)}` : '—'}</td>
                    <td className="px-6 py-3.5 text-right">{d.source_url && <a href={d.source_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400">Open source</a>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sources modal */}
      {sourcesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSourcesModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Select source</h2>
              <button type="button" onClick={() => setSourcesModalOpen(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="clips">Clips</option>
                  <option value="vods">VODs</option>
                </select>
                <select value={sourceSort} onChange={(e) => setSourceSort(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="newest">Sort: Newest first</option>
                  <option value="oldest">Sort: Oldest first</option>
                </select>
                <button type="button" onClick={() => onSyncSources(false)} disabled={syncing} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">{syncing ? 'Fetching...' : 'Fetch sources'}</button>
                <button type="button" onClick={() => onSyncSources(true)} disabled={syncing} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Force refresh</button>
              </div>
              {syncing && sources.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">Fetching sources...</p>
                : sources.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No sources found. Try force refresh.</p>
                : <SourceCardGrid sources={sortedSources} onUseSource={useSourceAndClose} columns={3} />}
            </div>
          </div>
        </div>
      )}

      {editClientModalOpen && client && <EditClientModal client={client} onSave={() => refresh()} onClose={() => setEditClientModalOpen(false)} />}
    </div>
  )
}
