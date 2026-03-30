import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, FileText, Plus, X } from 'lucide-react'
import { createInvoice, fetchBillingDeliverables, fetchBillingTotals, fetchClients, fetchInvoice, fetchInvoiceLineItems, fetchInvoices } from '../api'
import { useNotifications } from '../contexts/NotificationsContext'
import { useAuth } from '../contexts/AuthContext'
import { InfoTip } from '../components/Tooltip'

const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = new Date()
firstOfMonth.setDate(1)
const firstOfMonthStr = firstOfMonth.toISOString().slice(0, 10)

export function BillingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const clientIdFromUrl = searchParams.get('client_id')
  const invoiceIdFromUrl = searchParams.get('invoice_id')
  const { addNotification } = useNotifications()
  const { user } = useAuth()
  const [clients, setClients] = useState([])
  const [billingTotals, setBillingTotals] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [billingFilters, setBillingFilters] = useState({ client_id: clientIdFromUrl || '', period_start: firstOfMonthStr, period_end: today })
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({ client_id: clientIdFromUrl || '', period_start: firstOfMonthStr, period_end: today, label: '' })
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [detailInvoice, setDetailInvoice] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [exportInvoiceModalOpen, setExportInvoiceModalOpen] = useState(false)
  const [exportInvoiceForm, setExportInvoiceForm] = useState({ client_id: clientIdFromUrl || '', period_start: firstOfMonthStr, period_end: today })
  const [exporting, setExporting] = useState(false)
  const [lineItemsExporting, setLineItemsExporting] = useState(false)

  const clientById = useMemo(() => { const m = new Map(); for (const c of clients) m.set(String(c.id), c); return m }, [clients])

  async function refresh() {
    setLoading(true); setError(null)
    try {
      const params = { client_id: billingFilters.client_id ? Number(billingFilters.client_id) : undefined, period_start: billingFilters.period_start || undefined, period_end: billingFilters.period_end || undefined }
      const [cs, totals, invs] = await Promise.all([fetchClients(), fetchBillingTotals(params), fetchInvoices({ client_id: params.client_id })])
      setClients(cs); setBillingTotals(totals); setInvoices(invs)
      if (clientIdFromUrl && cs.length && !invoiceForm.client_id) { setInvoiceForm((f) => ({ ...f, client_id: clientIdFromUrl })); setBillingFilters((bf) => ({ ...bf, client_id: clientIdFromUrl })) }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [])

  useEffect(() => {
    if (!invoiceIdFromUrl) return
    const num = Number(invoiceIdFromUrl)
    if (!Number.isFinite(num)) return
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        const full = await fetchInvoice(num)
        if (cancelled) return
        setSelectedInvoice(full)
        setDetailInvoice(full)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) {
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev)
              next.delete('invoice_id')
              return next
            },
            { replace: true },
          )
        }
      }
    })()
    return () => { cancelled = true }
  }, [invoiceIdFromUrl, setSearchParams])

  useEffect(() => { if (clientIdFromUrl && clients.length && !invoiceForm.client_id) { setInvoiceForm((f) => ({ ...f, client_id: clientIdFromUrl })); setBillingFilters((bf) => ({ ...bf, client_id: clientIdFromUrl })) } }, [clientIdFromUrl, clients, invoiceForm.client_id])

  async function onCreateInvoice(e) {
    e.preventDefault(); setError(null); setSubmitting(true)
    try {
      const payload = { client_id: Number(invoiceForm.client_id), period_start: invoiceForm.period_start, period_end: invoiceForm.period_end, label: invoiceForm.label?.trim() || null }
      if (!payload.client_id) throw new Error('Client is required')
      if (!payload.period_start || !payload.period_end) throw new Error('Date range is required')
      await createInvoice(payload)
      addNotification({ type: 'success', title: 'Invoice created', message: `For period ${payload.period_start} to ${payload.period_end}` })
      setCreateModalOpen(false); setInvoiceForm((f) => ({ ...f, label: '' })); await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setSubmitting(false) }
  }

  async function openInvoiceDetail(inv) {
    setSelectedInvoice(inv); setError(null)
    try { const full = await fetchInvoice(inv.id); setDetailInvoice(full) }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); setDetailInvoice(null) }
  }

  function exportCsv() {
    const headers = ['Label', 'Client', 'Period Start', 'Period End', 'Total', 'Status', 'Created']
    const rows = invoices.map((inv) => { const c = clientById.get(String(inv.client_id)); return [inv.label || '', c ? c.name : `Client #${inv.client_id}`, inv.period_start || '', inv.period_end || '', String(Number(inv.total_amount).toFixed(2)), inv.status || '', inv.created_at ? new Date(inv.created_at).toLocaleString() : ''] })
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `invoices-${today}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  async function exportInvoiceAsCsv(e) {
    e.preventDefault(); setError(null); setExporting(true)
    try {
      const { client_id, period_start, period_end } = exportInvoiceForm
      if (!client_id || !period_start || !period_end) throw new Error('Client and date range are required')
      const deliverables = await fetchBillingDeliverables({ client_id: Number(client_id), period_start, period_end })
      const c = clientById.get(String(client_id))
      const clientName = c ? c.name : `Client #${client_id}`
      const editorName = user?.display_name || user?.email || 'Editor'
      const issueDate = new Date().toLocaleDateString()
      const invoiceNum = `INV-${period_start.replace(/-/g, '')}-${String(client_id).padStart(3, '0')}`

      const paidItems = deliverables.filter((d) => d.payment_status === 'paid')
      const unpaidItems = deliverables.filter((d) => d.payment_status !== 'paid')
      const paidTotal = paidItems.reduce((s, d) => s + Number(d.price_value || 0), 0)
      const unpaidTotal = unpaidItems.reduce((s, d) => s + Number(d.price_value || 0), 0)
      const total = paidTotal + unpaidTotal

      const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
      const formatDate = (d) => d.completed_at || d.created_at ? new Date(d.completed_at || d.created_at).toLocaleDateString() : ''
      const fmtAmt = (v) => `$${Number(v || 0).toFixed(2)}`

      const lines = [
        ',,INVOICE,,',
        '',
        `Invoice Number:,${esc(invoiceNum)}`,
        `Date Issued:,${esc(issueDate)}`,
        `Billing Period:,${esc(period_start + ' to ' + period_end)}`,
        '',
        `From:,${esc(editorName)}`,
        `To:,${esc(clientName)}`,
        '',
        '---,---,---,---,---',
        '',
        ['#', 'Title', 'Type', 'Date', 'Amount'].map(esc).join(','),
        ...deliverables.map((d, i) =>
          [i + 1, d.title || 'Untitled', (d.type || '').charAt(0).toUpperCase() + (d.type || '').slice(1), formatDate(d), fmtAmt(d.price_value)].map(esc).join(',')
        ),
        '',
        '---,---,---,---,---',
        '',
        `,,,,${esc('SUMMARY')}`,
        `,,,Deliverables:,${esc(String(deliverables.length))}`,
        `,,,Paid (${paidItems.length} items):,${esc(fmtAmt(paidTotal))}`,
        `,,,Unpaid (${unpaidItems.length} items):,${esc(fmtAmt(unpaidTotal))}`,
        '',
        `,,,"TOTAL DUE:",${esc(fmtAmt(unpaidTotal))}`,
        `,,,"TOTAL VALUE:",${esc(fmtAmt(total))}`,
        '',
        `Generated by EditTrack on ${issueDate}`,
      ]

      const csv = lines.join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoiceNum}-${clientName.replace(/\s+/g, '-')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      addNotification({ type: 'success', title: 'Invoice exported', message: `${invoiceNum} — ${deliverables.length} deliverables` })
      setExportInvoiceModalOpen(false)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setExporting(false) }
  }

  async function exportInvoicedDeliverablesCsv() {
    setError(null)
    setLineItemsExporting(true)
    try {
      const rows = await fetchInvoiceLineItems({
        client_id: billingFilters.client_id ? Number(billingFilters.client_id) : undefined,
        period_start: billingFilters.period_start || undefined,
        period_end: billingFilters.period_end || undefined,
      })
      if (!rows.length) throw new Error('No invoiced deliverables found for these filters.')

      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
      const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : '')
      const fmtAmt = (v) => `$${Number(v || 0).toFixed(2)}`
      const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
      const editorName = user?.display_name || user?.email || 'Editor'
      const issueDate = new Date().toLocaleDateString()
      const periodLabel = billingFilters.period_start && billingFilters.period_end
        ? `${billingFilters.period_start} to ${billingFilters.period_end}`
        : 'All time'

      const grouped = new Map()
      for (const r of rows) {
        if (!grouped.has(r.invoice_id)) grouped.set(r.invoice_id, { ...r, items: [] })
        grouped.get(r.invoice_id).items.push(r)
      }

      const lines = [
        ',,INVOICED DELIVERABLES REPORT,,',
        '',
        `Generated by:,${esc(editorName)}`,
        `Date:,${esc(issueDate)}`,
        `Period:,${esc(periodLabel)}`,
        `Total invoices:,${esc(String(grouped.size))}`,
        `Total line items:,${esc(String(rows.length))}`,
        `Grand total:,${esc(fmtAmt(rows.reduce((s, r) => s + Number(r.line_amount || 0), 0)))}`,
        '',
      ]

      for (const [, inv] of grouped) {
        lines.push('---,---,---,---,---,---')
        lines.push(`Invoice:,${esc(inv.invoice_label)},Status:,${esc(cap(inv.invoice_status))},Total:,${esc(fmtAmt(inv.invoice_total))}`)
        lines.push(`Client:,${esc(inv.client_name)},Period:,${esc(inv.invoice_period_start + ' to ' + inv.invoice_period_end)},Created:,${esc(fmtDate(inv.invoice_created_at))}`)
        lines.push('')
        lines.push(['#', 'Deliverable', 'Type', 'Date', 'Payment', 'Amount'].map(esc).join(','))
        inv.items.forEach((item, i) => {
          lines.push(
            [i + 1, item.deliverable_title || 'Untitled', cap(item.deliverable_type), fmtDate(item.deliverable_effective_at), cap(item.deliverable_payment_status), fmtAmt(item.line_amount)].map(esc).join(',')
          )
        })
        const subtotal = inv.items.reduce((s, it) => s + Number(it.line_amount || 0), 0)
        lines.push(`,,,,,${esc('Subtotal: ' + fmtAmt(subtotal))}`)
        lines.push('')
      }

      lines.push(`Generated by EditTrack on ${issueDate}`)

      const csv = lines.join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoiced-deliverables-${today}.csv`
      a.click()
      URL.revokeObjectURL(url)
      addNotification({ type: 'success', title: 'Report exported', message: `${grouped.size} invoice${grouped.size === 1 ? '' : 's'}, ${rows.length} deliverable${rows.length === 1 ? '' : 's'}` })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLineItemsExporting(false)
    }
  }

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500'
  const th = 'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400'

  return (
    <div className="space-y-6" data-tour="billing">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Billing</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">View totals, create invoices, and export reports.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setExportInvoiceForm({ client_id: billingFilters.client_id || (clients[0] ? String(clients[0].id) : ''), period_start: billingFilters.period_start, period_end: billingFilters.period_end }); setExportInvoiceModalOpen(true) }} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"><Download className="h-4 w-4" /> Export Report<InfoTip content="Export a detailed CSV for a specific client and date range, showing individual deliverables and totals." /></button>
          <button type="button" onClick={exportInvoicedDeliverablesCsv} disabled={lineItemsExporting} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"><Download className="h-4 w-4" />{lineItemsExporting ? 'Exporting…' : 'Invoiced deliverables'}<InfoTip content="CSV with one row per deliverable on an invoice (period batch or single-deliverable). Uses the client and date filters below; dates filter by invoice created date." /></button>
          <button type="button" onClick={exportCsv} disabled={invoices.length === 0} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"><Download className="h-4 w-4" /> Export CSV<InfoTip content="Download a summary CSV of all invoices currently shown in the table." /></button>
          <button type="button" onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"><Plus className="h-4 w-4" /> Create invoice</button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">{error}</div>}

      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-slate-500">Paid: <strong className="text-emerald-600 dark:text-emerald-400">${billingTotals ? Number(billingTotals.paid_total).toFixed(2) : '0.00'}</strong><InfoTip content="Total revenue from paid deliverables in the selected period." /></span>
        <span className="text-sm text-slate-500">Unpaid: <strong className="text-amber-600 dark:text-amber-400">${billingTotals ? Number(billingTotals.unpaid_total).toFixed(2) : '0.00'}</strong><InfoTip content="Total outstanding revenue from unpaid deliverables." /></span>
        <div className="flex flex-nowrap items-center gap-3">
          <select value={billingFilters.client_id} onChange={(e) => setBillingFilters((f) => ({ ...f, client_id: e.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"><option value="">All clients</option>{clients.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}</select>
          <input type="date" value={billingFilters.period_start} onChange={(e) => setBillingFilters((f) => ({ ...f, period_start: e.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          <input type="date" value={billingFilters.period_end} onChange={(e) => setBillingFilters((f) => ({ ...f, period_end: e.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          <button type="button" onClick={refresh} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">Apply</button>
        </div>
      </div>

      {/* Invoices table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead><tr className="border-b border-slate-100 dark:border-slate-800"><th className={th}>Label</th><th className={th}>Client</th><th className={th}>Period</th><th className={th}>Total</th><th className={th}>Status</th><th className={th}>Created</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-12 text-center"><FileText className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" /><p className="mt-2 text-sm text-slate-400">No invoices yet.</p></td></tr>
                ) : invoices.map((inv) => {
                  const c = clientById.get(String(inv.client_id))
                  const statusColors = { paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400', partial: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400', unpaid: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' }
                  return (
                    <tr key={inv.id} onClick={() => openInvoiceDetail(inv)} className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3.5"><span className="font-medium text-slate-900 dark:text-white">{inv.label}</span></td>
                      <td className="px-4 py-3.5 text-sm text-slate-400">{c ? c.name : `Client #${inv.client_id}`}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-400">{inv.period_start} → {inv.period_end}</td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white">${Number(inv.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[inv.status] || statusColors.unpaid}`}>{inv.status}</span></td>
                      <td className="px-4 py-3.5 text-sm text-slate-400">{inv.created_at ? new Date(inv.created_at).toLocaleString() : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setCreateModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create invoice</h2>
              <button type="button" onClick={() => setCreateModalOpen(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={onCreateInvoice} className="p-6 space-y-4">
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Client</span><select required value={invoiceForm.client_id} onChange={(e) => setInvoiceForm((f) => ({ ...f, client_id: e.target.value }))} className={inputClass}><option value="">Select client...</option>{clients.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}</select></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Label (optional)</span><input value={invoiceForm.label} onChange={(e) => setInvoiceForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. March 2026" className={inputClass} /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Period start</span><input required type="date" value={invoiceForm.period_start} onChange={(e) => setInvoiceForm((f) => ({ ...f, period_start: e.target.value }))} className={inputClass} /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Period end</span><input required type="date" value={invoiceForm.period_end} onChange={(e) => setInvoiceForm((f) => ({ ...f, period_end: e.target.value }))} className={inputClass} /></label>
              <button type="submit" disabled={submitting} className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50">{submitting ? 'Creating...' : 'Create invoice'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Export Invoice Modal */}
      {exportInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setExportInvoiceModalOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Export Invoice Report</h2>
              <button type="button" onClick={() => setExportInvoiceModalOpen(false)} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={exportInvoiceAsCsv} className="p-6 space-y-4">
              <p className="text-sm text-slate-500">Select client and date range. The CSV will list paid/unpaid deliverables and totals.</p>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Client</span><select required value={exportInvoiceForm.client_id} onChange={(e) => setExportInvoiceForm((f) => ({ ...f, client_id: e.target.value }))} className={inputClass}><option value="">Select client...</option>{clients.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}</select></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Period start</span><input required type="date" value={exportInvoiceForm.period_start} onChange={(e) => setExportInvoiceForm((f) => ({ ...f, period_start: e.target.value }))} className={inputClass} /></label>
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Period end</span><input required type="date" value={exportInvoiceForm.period_end} onChange={(e) => setExportInvoiceForm((f) => ({ ...f, period_end: e.target.value }))} className={inputClass} /></label>
              <button type="submit" disabled={exporting} className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50">{exporting ? 'Exporting...' : 'Export CSV'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => { setSelectedInvoice(null); setDetailInvoice(null) }}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{detailInvoice ? detailInvoice.label : selectedInvoice.label}</h2>
              <button type="button" onClick={() => { setSelectedInvoice(null); setDetailInvoice(null) }} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
              {detailInvoice ? (
                <>
                  <div className="mb-6 flex flex-wrap gap-4 text-sm">
                    <span className="text-slate-500">Client: <strong className="text-slate-900 dark:text-white">{clientById.get(String(detailInvoice.client_id))?.name ?? `#${detailInvoice.client_id}`}</strong></span>
                    <span className="text-slate-500">Period: {detailInvoice.period_start} → {detailInvoice.period_end}</span>
                    <span className="text-slate-500">Total: <strong className="text-slate-900 dark:text-white">${Number(detailInvoice.total_amount).toFixed(2)}</strong></span>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${detailInvoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : detailInvoice.status === 'partial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>{detailInvoice.status}</span>
                  </div>
                  <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">Deliverables</h3>
                  {detailInvoice.items?.length ? (
                    <table className="min-w-full">
                      <thead><tr className="border-b border-slate-100 dark:border-slate-800"><th className={th}>Title</th><th className={th}>Type</th><th className={th}>Date</th><th className={th}>Amount</th><th className={th}>Payment</th><th className={th}></th></tr></thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {detailInvoice.items.map((item) => {
                          const d = item.deliverable
                          return (
                            <tr key={item.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{d?.title ?? '—'}</td>
                              <td className="px-4 py-3 text-sm capitalize text-slate-400">{d?.type ?? '—'}</td>
                              <td className="px-4 py-3 text-sm text-slate-400">{d?.completed_at || d?.created_at ? new Date(d.completed_at || d.created_at).toLocaleDateString() : '—'}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">${Number(item.amount).toFixed(2)}</td>
                              <td className={`px-4 py-3 text-sm capitalize ${d?.payment_status === 'paid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{d?.payment_status ?? '—'}</td>
                              <td className="px-4 py-3">{d?.source_url && <a href={d.source_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400" onClick={(e) => e.stopPropagation()}>Open source</a>}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : <p className="text-sm text-slate-400">No deliverables in this invoice.</p>}
                </>
              ) : <div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
