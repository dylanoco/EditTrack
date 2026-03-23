import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, FileText, Plus, X } from 'lucide-react'
import { fetchClients, fetchDeliverables, syncClientSources, updateDeliverable } from '../api'
import { SourceCardGrid } from '../components/SourceCardGrid'
import { useNotifications } from '../contexts/NotificationsContext'
import { InfoTip } from '../components/Tooltip'

const initialEditForm = {
  client_id: '', type: 'short', title: '', description: '', source_id: null,
  source_title: '', duration_sec: null, source_url: '', status: 'incomplete',
  payment_status: 'unpaid', price_mode: 'auto', price_value: '',
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
  const [sourceType, setSourceType] = useState('clips')
  const [sourceSort, setSourceSort] = useState('newest')

  const clientById = useMemo(() => {
    const m = new Map()
    for (const c of [...clients, ...archivedClients]) m.set(String(c.id), c)
    return m
  }, [clients, archivedClients])

  async function refresh() {
    setLoading(true); setError(null)
    try {
      const [c, ac, d, ad] = await Promise.all([fetchClients(), fetchClients({ archived: true }), fetchDeliverables(), fetchDeliverables({ archived: true })])
      setClients(c); setArchivedClients(ac); setDeliverables(d); setArchivedDeliverables(ad)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [])

  function openEdit(d) {
    setEditingId(d.id); setSources([])
    setEditForm({ client_id: String(d.client_id), type: d.type ?? 'short', title: d.title ?? '', description: d.description ?? '', source_id: d.source_id ?? null, source_title: d.source_title ?? '', duration_sec: d.duration_sec ?? null, source_url: d.source_url ?? '', status: d.status ?? 'incomplete', payment_status: d.payment_status ?? 'unpaid', price_mode: d.price_mode ?? 'auto', price_value: d.price_value != null ? String(d.price_value) : '' })
  }

  async function fetchSourcesForEdit(force = false) {
    if (!editForm.client_id) return; setSourcesLoading(true)
    try {
      const list = await syncClientSources(Number(editForm.client_id), 'twitch', force, sourceType)
      const label = sourceType === 'vods' ? 'VOD(s)' : 'clip(s)'
      addNotification({ type: 'success', title: 'Sources synced', message: `Fetched ${list.length} Twitch ${label}` })
      setSources(list)
    }
    catch { setSources([]) } finally { setSourcesLoading(false) }
  }

  function openSourcesModal() { if (!editForm.client_id) return; setSourcesModalOpen(true); if (sources.length === 0) fetchSourcesForEdit(false) }
  function useSource(s) { setEditForm((f) => ({ ...f, source_id: s.id ?? null, source_title: s.title ?? '', duration_sec: s.duration_sec ?? null, source_url: s.url ?? '', title: s.title?.trim() || f.title })); setSourcesModalOpen(false) }

  async function onUpdate(e) {
    e.preventDefault(); if (!editingId) return; setError(null)
    try {
      const payload = { client_id: Number(editForm.client_id), type: editForm.type, title: editForm.title.trim(), description: editForm.description?.trim() || null, source_id: editForm.source_id != null ? Number(editForm.source_id) : null, source_title: editForm.source_title?.trim() || null, duration_sec: editForm.duration_sec != null ? Number(editForm.duration_sec) : null, source_url: editForm.source_url?.trim() || null, status: editForm.status, payment_status: editForm.payment_status ?? 'unpaid', price_mode: editForm.price_mode }
      if (payload.price_mode === 'override') { const val = editForm.price_value; if (val === '' || val == null) throw new Error('Manual price required when using override'); payload.price_value = Number(val) }
      await updateDeliverable(editingId, payload)
      if (payload.payment_status === 'paid') addNotification({ type: 'success', title: 'Deliverable marked paid', message: payload.title || 'Payment recorded' })
      await refresh(); setEditingId(null)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }

  async function archive(id) { setError(null); try { await updateDeliverable(id, { archived: true }); await refresh() } catch (e) { setError(e instanceof Error ? e.message : String(e)) } }
  async function restore(id) { setError(null); try { await updateDeliverable(id, { archived: false }); await refresh() } catch (e) { setError(e instanceof Error ? e.message : String(e)) } }

  const totals = useMemo(() => {
    const paid = deliverables.filter((d) => d.payment_status === 'paid').reduce((s, d) => s + Number(d.price_value || 0), 0)
    const unpaid = deliverables.filter((d) => d.payment_status !== 'paid').reduce((s, d) => s + Number(d.price_value || 0), 0)
    return { paid, unpaid }
  }, [deliverables])

  const filteredDeliverables = useMemo(() => deliverables.filter((d) => {
    if (filterPayment === 'paid' && d.payment_status !== 'paid') return false
    if (filterPayment === 'unpaid' && d.payment_status === 'paid') return false
    if (filterClient && String(d.client_id) !== filterClient) return false
    if (filterType && d.type !== filterType) return false
    return true
  }), [deliverables, filterPayment, filterClient, filterType])

  const sortedSources = useMemo(() => {
    const copy = [...sources]
    copy.sort((a, b) => {
      const aTime = new Date(a.fetched_at || a.created_at || 0).getTime()
      const bTime = new Date(b.fetched_at || b.created_at || 0).getTime()
      return sourceSort === 'oldest' ? aTime - bTime : bTime - aTime
    })
    return copy
  }, [sources, sourceSort])

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white'
  const th = 'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400'

  return (
    <div className="space-y-6" data-tour="deliverables">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Deliverables</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage and edit deliverables.</p>
        </div>
        <Link to="/deliverables/create" className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"><Plus className="h-4 w-4" /> Create deliverable</Link>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">{error}</div>}

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">Paid: <strong className="text-emerald-600 dark:text-emerald-400">${totals.paid.toFixed(2)}</strong><InfoTip content="Total value of deliverables marked as paid." /></span>
          <span className="text-sm text-slate-500">Unpaid: <strong className="text-amber-600 dark:text-amber-400">${totals.unpaid.toFixed(2)}</strong><InfoTip content="Total value of deliverables not yet fully paid." /></span>
        </div>
        <div className="flex flex-nowrap items-center gap-3">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
            {['all', 'paid', 'unpaid'].map((v) => (
              <button key={v} type="button" onClick={() => setFilterPayment(v)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all ${filterPayment === v ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{v}</button>
            ))}
          </div>
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"><option value="">Client</option>{clients.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}</select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"><option value="">Type</option><option value="short">Short</option><option value="thumbnail">Thumbnail</option><option value="video">Video</option></select>
        </div>
      </div>

      {/* Edit modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditingId(null)}>
          <div className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit deliverable</h2>
              <button type="button" onClick={() => setEditingId(null)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={onUpdate} className="max-h-[calc(90vh-140px)] overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Client</span><select value={editForm.client_id} onChange={(e) => { setEditForm((f) => ({ ...f, client_id: e.target.value })); setSources([]) }} className={inputClass}>{[...clients, ...archivedClients].map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}</select></label>
                <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Type</span><select value={editForm.type} onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))} className={inputClass}><option value="short">Short</option><option value="thumbnail">Thumbnail</option><option value="video">Video</option></select></label>
                <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Title</span><input required value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} className={inputClass} /></label>
                <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</span><input value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional" className={inputClass} /></label>
                <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Source URL</span><div className="flex gap-2"><input type="url" value={editForm.source_url} onChange={(e) => setEditForm((f) => ({ ...f, source_url: e.target.value }))} placeholder="https://..." className={inputClass} />{editForm.source_url && <a href={editForm.source_url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">Open</a>}</div></label>
              </div>
              <div className="border-t border-slate-200 pt-6 dark:border-slate-800"><h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Sources<InfoTip content="Pull recent Twitch clips for this client to auto-fill source details." /></h2><button type="button" onClick={openSourcesModal} disabled={!editForm.client_id} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed">Fetch sources</button></div>
              <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
                <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Status & Pricing</h2>
                <div className="space-y-4">
                  <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</span><select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} className={inputClass}><option value="incomplete">Incomplete</option><option value="complete">Complete</option></select></label>
                  <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Payment</span><select value={editForm.payment_status} onChange={(e) => setEditForm((f) => ({ ...f, payment_status: e.target.value }))} className={inputClass}><option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option></select></label>
                  <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Price mode<InfoTip content="Auto uses the client's per-type rate. Override lets you set a custom price." /></span><select value={editForm.price_mode} onChange={(e) => setEditForm((f) => ({ ...f, price_mode: e.target.value }))} className={inputClass}><option value="auto">Auto</option><option value="override">Override</option></select></label>
                  {editForm.price_mode === 'override' && <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Manual price ($)</span><input type="number" step="0.01" min="0" value={editForm.price_value} onChange={(e) => setEditForm((f) => ({ ...f, price_value: e.target.value }))} className={inputClass} /></label>}
                </div>
              </div>
              <button type="submit" className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-violet-700">Save</button>
            </form>
          </div>
        </div>
      )}

      {/* Sources sub-modal */}
      {sourcesModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSourcesModalOpen(false)}>
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
                <button type="button" onClick={() => fetchSourcesForEdit(false)} disabled={sourcesLoading} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">{sourcesLoading ? 'Fetching...' : 'Fetch sources'}</button>
                <button type="button" onClick={() => fetchSourcesForEdit(true)} disabled={sourcesLoading} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Force refresh</button>
              </div>
              {sourcesLoading && sources.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">Fetching sources...</p> : sources.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No sources found. Try force refresh.</p> : <SourceCardGrid sources={sortedSources} onUseSource={useSource} columns={3} />}
            </div>
          </div>
        </div>
      )}

      {/* Deliverables table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>
          ) : (
            <table className="min-w-full">
              <thead><tr className="border-b border-slate-100 dark:border-slate-800"><th className={th}>Title</th><th className={th}>Client</th><th className={th}>Type</th><th className={th}>Date</th><th className={th}>Payment</th><th className={th}>Price</th><th className={th}>Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDeliverables.length === 0 ? (
                  <tr><td colSpan="7" className="px-4 py-12 text-center"><FileText className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" /><p className="mt-2 text-sm text-slate-400">{deliverables.length === 0 ? 'No deliverables yet.' : 'No deliverables match filters.'}</p></td></tr>
                ) : filteredDeliverables.map((d) => {
                  const c = clientById.get(String(d.client_id))
                  const payment = d.payment_status || 'unpaid'
                  const typeColors = { short: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400', thumbnail: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400', video: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' }
                  const paymentColors = { paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', partial: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', unpaid: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' }
                  return (
                    <tr key={d.id} onClick={() => openEdit(d)} className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3.5"><span className="text-sm font-semibold text-slate-900 dark:text-white">{d.title || 'Untitled'}</span></td>
                      <td className="px-4 py-3.5 text-sm text-slate-400">{c ? c.name : `#${d.client_id}`}</td>
                      <td className="px-4 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${typeColors[d.type] || 'bg-slate-100 text-slate-600'}`}>{d.type || '—'}</span></td>
                      <td className="px-4 py-3.5 text-sm text-slate-400">{d.completed_at || d.created_at ? new Date(d.completed_at || d.created_at).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${paymentColors[payment] || paymentColors.unpaid}`}>{payment === 'paid' ? '✓ Paid' : payment === 'partial' ? 'Partial' : 'Unpaid'}</span></td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white">{d.price_value != null ? `$${Number(d.price_value).toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {d.source_url && <a href={d.source_url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-violet-600 dark:hover:bg-slate-800" title="Open source"><ExternalLink className="h-4 w-4" /></a>}
                          <button type="button" onClick={() => openEdit(d)} className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-700">Edit</button>
                          <button type="button" onClick={() => archive(d.id)} className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">Archive</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Archived */}
      {archivedDeliverables.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <h2 className="px-6 py-4 text-base font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800">Archived deliverables</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead><tr className="border-b border-slate-100 dark:border-slate-800"><th className={th}>Title</th><th className={th}>Client</th><th className={th}>Type</th><th className={th}>Date</th><th className={th}>Payment</th><th className={th}>Price</th><th className={th}>Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {archivedDeliverables.map((d) => {
                  const c = clientById.get(String(d.client_id))
                  const payment = d.payment_status || 'unpaid'
                  const typeColors = { short: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400', thumbnail: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400', video: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' }
                  const paymentColors = { paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', partial: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', unpaid: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' }
                  return (
                    <tr key={d.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3.5"><span className="font-semibold text-slate-900 dark:text-white">{d.title || 'Untitled'}</span></td>
                      <td className="px-4 py-3.5 text-sm text-slate-400">{c ? c.name : `#${d.client_id}`}</td>
                      <td className="px-4 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${typeColors[d.type] || 'bg-slate-100 text-slate-600'}`}>{d.type || '—'}</span></td>
                      <td className="px-4 py-3.5 text-sm text-slate-400">{d.completed_at || d.created_at ? new Date(d.completed_at || d.created_at).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${paymentColors[payment] || paymentColors.unpaid}`}>{payment === 'paid' ? 'Paid ✓' : payment}</span></td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white">{d.price_value != null ? `$${Number(d.price_value).toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-3.5"><button type="button" onClick={() => restore(d.id)} className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-700">Restore</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
