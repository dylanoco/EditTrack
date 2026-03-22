import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { X } from 'lucide-react'
import {
  createInvoice,
  fetchBillingTotals,
  fetchClients,
  fetchInvoice,
  fetchInvoices,
} from '../api'
import { useNotifications } from '../contexts/NotificationsContext'

const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = new Date()
firstOfMonth.setDate(1)
const firstOfMonthStr = firstOfMonth.toISOString().slice(0, 10)

export function BillingPage() {
  const [searchParams] = useSearchParams()
  const clientIdFromUrl = searchParams.get('client_id')
  const { addNotification } = useNotifications()
  const [clients, setClients] = useState([])
  const [billingTotals, setBillingTotals] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [billingFilters, setBillingFilters] = useState({
    client_id: clientIdFromUrl || '',
    period_start: firstOfMonthStr,
    period_end: today,
  })
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({
    client_id: clientIdFromUrl || '',
    period_start: firstOfMonthStr,
    period_end: today,
    label: '',
  })
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [detailInvoice, setDetailInvoice] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const clientById = useMemo(() => {
    const m = new Map()
    for (const c of clients) m.set(String(c.id), c)
    return m
  }, [clients])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const params = {
        client_id: billingFilters.client_id ? Number(billingFilters.client_id) : undefined,
        period_start: billingFilters.period_start || undefined,
        period_end: billingFilters.period_end || undefined,
      }
      const [cs, totals, invs] = await Promise.all([
        fetchClients(),
        fetchBillingTotals(params),
        fetchInvoices({ client_id: params.client_id }),
      ])
      setClients(cs)
      setBillingTotals(totals)
      setInvoices(invs)
      if (clientIdFromUrl && cs.length && !invoiceForm.client_id) {
        setInvoiceForm((f) => ({ ...f, client_id: clientIdFromUrl }))
        setBillingFilters((bf) => ({ ...bf, client_id: clientIdFromUrl }))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    if (clientIdFromUrl && clients.length && !invoiceForm.client_id) {
      setInvoiceForm((f) => ({ ...f, client_id: clientIdFromUrl }))
      setBillingFilters((bf) => ({ ...bf, client_id: clientIdFromUrl }))
    }
  }, [clientIdFromUrl, clients, invoiceForm.client_id])

  async function onCreateInvoice(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        client_id: Number(invoiceForm.client_id),
        period_start: invoiceForm.period_start,
        period_end: invoiceForm.period_end,
        label: invoiceForm.label?.trim() || null,
      }
      if (!payload.client_id) throw new Error('Client is required')
      if (!payload.period_start || !payload.period_end) throw new Error('Date range is required')
      await createInvoice(payload)
      addNotification({ type: 'success', title: 'Invoice created', message: `For period ${payload.period_start} to ${payload.period_end}` })
      setCreateModalOpen(false)
      setInvoiceForm((f) => ({ ...f, label: '' }))
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function openInvoiceDetail(inv) {
    setSelectedInvoice(inv)
    setError(null)
    try {
      const full = await fetchInvoice(inv.id)
      setDetailInvoice(full)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setDetailInvoice(null)
    }
  }

  function closeInvoiceDetail() {
    setSelectedInvoice(null)
    setDetailInvoice(null)
  }

  function exportCsv() {
    const headers = ['Label', 'Client', 'Period Start', 'Period End', 'Total', 'Status', 'Created']
    const rows = invoices.map((inv) => {
      const c = clientById.get(String(inv.client_id))
      return [
        inv.label || '',
        c ? c.name : `Client #${inv.client_id}`,
        inv.period_start || '',
        inv.period_end || '',
        String(Number(inv.total_amount).toFixed(2)),
        inv.status || '',
        inv.created_at ? new Date(inv.created_at).toLocaleString() : '',
      ]
    })
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoices-${today}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400'
  const tableHeader =
    'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Billing</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View totals and create invoices.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={invoices.length === 0}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Create invoice
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Paid: <strong className="text-green-600 dark:text-green-400">${billingTotals ? Number(billingTotals.paid_total).toFixed(2) : '0.00'}</strong>
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Unpaid: <strong className="text-amber-600 dark:text-amber-400">${billingTotals ? Number(billingTotals.unpaid_total).toFixed(2) : '0.00'}</strong>
        </span>
        <div className="flex flex-nowrap items-center gap-3">
          <select
            value={billingFilters.client_id}
            onChange={(e) => setBillingFilters((f) => ({ ...f, client_id: e.target.value }))}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={billingFilters.period_start}
            onChange={(e) => setBillingFilters((f) => ({ ...f, period_start: e.target.value }))}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <input
            type="date"
            value={billingFilters.period_end}
            onChange={(e) => setBillingFilters((f) => ({ ...f, period_end: e.target.value }))}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="button"
            onClick={refresh}
            className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-700"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-gray-700 dark:bg-gray-800">
        {loading ? (
          <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className={tableHeader}>Label</th>
                  <th className={tableHeader}>Client</th>
                  <th className={tableHeader}>Period</th>
                  <th className={tableHeader}>Total</th>
                  <th className={tableHeader}>Status</th>
                  <th className={tableHeader}>Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-sm text-gray-500">
                      No invoices yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const c = clientById.get(String(inv.client_id))
                    const statusClass =
                      inv.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400'
                        : inv.status === 'partial'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => openInvoiceDetail(inv)}
                        className="cursor-pointer transition-colors hover:bg-violet-50 dark:hover:bg-violet-900/15"
                      >
                        <td className="px-4 py-3.5">
                          <span className="font-medium text-gray-900 dark:text-white">{inv.label}</span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                          {c ? c.name : `Client #${inv.client_id}`}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                          {inv.period_start} → {inv.period_end}
                        </td>
                        <td className="px-4 py-3.5 text-sm font-semibold text-gray-900 dark:text-white">
                          ${Number(inv.total_amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                          {inv.created_at ? new Date(inv.created_at).toLocaleString() : ''}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          style={{ left: 'var(--sidebar-width, 17.5rem)' }}
          onClick={() => setCreateModalOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create invoice</h2>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={onCreateInvoice} className="p-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Client</span>
                <select
                  required
                  value={invoiceForm.client_id}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, client_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Select client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Label (optional)</span>
                <input
                  value={invoiceForm.label}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. March 2026"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Period start</span>
                <input
                  required
                  type="date"
                  value={invoiceForm.period_start}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, period_start: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Period end</span>
                <input
                  required
                  type="date"
                  value={invoiceForm.period_end}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, period_end: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {submitting ? 'Creating…' : 'Create invoice'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {selectedInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          style={{ left: 'var(--sidebar-width, 17.5rem)' }}
          onClick={closeInvoiceDetail}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {detailInvoice ? detailInvoice.label : selectedInvoice.label}
              </h2>
              <button
                type="button"
                onClick={closeInvoiceDetail}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
              {detailInvoice ? (
                <>
                  <div className="mb-6 flex flex-wrap gap-4 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Client: <strong className="text-gray-900 dark:text-white">
                        {clientById.get(String(detailInvoice.client_id))?.name ?? `#${detailInvoice.client_id}`}
                      </strong>
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      Period: {detailInvoice.period_start} → {detailInvoice.period_end}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      Total: <strong className="text-gray-900 dark:text-white">${Number(detailInvoice.total_amount).toFixed(2)}</strong>
                    </span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                      detailInvoice.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400'
                        : detailInvoice.status === 'partial'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                    }`}>
                      {detailInvoice.status}
                    </span>
                  </div>
                  <h3 className="mb-3 text-base font-bold text-gray-900 dark:text-white">Deliverables</h3>
                  {detailInvoice.items?.length ? (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead>
                        <tr>
                          <th className={tableHeader}>Title</th>
                          <th className={tableHeader}>Type</th>
                          <th className={tableHeader}>Amount</th>
                          <th className={tableHeader}>Payment</th>
                          <th className={tableHeader}></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {detailInvoice.items.map((item) => {
                          const d = item.deliverable
                          const paymentClass =
                            d?.payment_status === 'paid'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          return (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                {d?.title ?? '—'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 capitalize">
                                {d?.type ?? '—'}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                                ${Number(item.amount).toFixed(2)}
                              </td>
                              <td className={`px-4 py-3 text-sm capitalize ${paymentClass}`}>
                                {d?.payment_status ?? '—'}
                              </td>
                              <td className="px-4 py-3">
                                {d?.source_url ? (
                                  <a
                                    href={d.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-violet-600 hover:text-violet-700 text-sm font-medium"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Open source
                                  </a>
                                ) : null}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No deliverables in this invoice.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading invoice details…</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
