import './App.css'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createInvoice,
  fetchBillingTotals,
  fetchClients,
  fetchInvoices,
  syncClientSources,
} from './api.js'
import { SourceCardGrid } from './components/SourceCardGrid'
import { useNotifications } from './contexts/NotificationsContext'

export function LegacyContent({ activeTab }) {
  const navigate = useNavigate()
  const { addNotification } = useNotifications()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const [clients, setClients] = useState([])
  const [clientSources, setClientSources] = useState([])
  const [clientSourcesLoading, setClientSourcesLoading] = useState(false)
  const [sourcesClientId, setSourcesClientId] = useState('')
  const [sourcesPlatform, setSourcesPlatform] = useState('twitch')

  const [billingTotals, setBillingTotals] = useState(null)
  const [invoices, setInvoices] = useState([])
  const today = new Date().toISOString().slice(0, 10)
  const firstOfMonth = new Date()
  firstOfMonth.setDate(1)
  const firstOfMonthStr = firstOfMonth.toISOString().slice(0, 10)
  const [billingFilters, setBillingFilters] = useState({
    client_id: '',
    period_start: firstOfMonthStr,
    period_end: today,
  })
  const [invoiceForm, setInvoiceForm] = useState({
    client_id: '',
    period_start: firstOfMonthStr,
    period_end: today,
    label: '',
  })

  const clientById = useMemo(() => {
    const m = new Map()
    for (const c of clients) m.set(String(c.id), c)
    return m
  }, [clients])

  async function refreshClients() {
    setError(null)
    try {
      const c = await fetchClients()
      setClients(c)
      if (c.length && !sourcesClientId) setSourcesClientId(String(c[0].id))
      if (c.length && !invoiceForm.client_id) {
        setInvoiceForm((f) => ({ ...f, client_id: String(c[0].id) }))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function refreshBilling() {
    setError(null)
    setLoading(true)
    try {
      const params = {
        client_id: billingFilters.client_id ? Number(billingFilters.client_id) : undefined,
        period_start: billingFilters.period_start || undefined,
        period_end: billingFilters.period_end || undefined,
      }
      const [totals, invs] = await Promise.all([
        fetchBillingTotals(params),
        fetchInvoices({ client_id: params.client_id }),
      ])
      setBillingTotals(totals)
      setInvoices(invs)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshClients()
  }, [])

  useEffect(() => {
    if (activeTab === 'billing') refreshBilling()
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'sources' && clients.length && !sourcesClientId) {
      setSourcesClientId(String(clients[0].id))
    }
  }, [activeTab, clients, sourcesClientId])

  async function fetchSourcesForClient(clientId, platform, force = false) {
    if (!clientId || platform !== 'twitch') {
      setError(platform !== 'twitch' ? 'YouTube not available yet.' : 'Select a client first.')
      return
    }
    setError(null)
    setClientSourcesLoading(true)
    try {
      const list = await syncClientSources(Number(clientId), 'twitch', force)
      addNotification({ type: 'success', title: 'Sources synced', message: `Fetched ${list.length} Twitch clip(s)` })
      setClientSources(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setClientSources([])
    } finally {
      setClientSourcesLoading(false)
    }
  }

  function createDeliverableFromSource(source, clientId) {
    navigate('/deliverables/create', { state: { source, clientId: Number(clientId) } })
  }

  async function onCreateInvoice(e) {
    e.preventDefault()
    setError(null)
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
      await refreshBilling()
      setInvoiceForm((f) => ({ ...f, label: '' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : null}
      {loading && activeTab === 'billing' ? <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p> : null}

      {activeTab === 'sources' ? (
        <>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Sources</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Fetch Twitch clips for clients and create deliverables from them.</p>
          </div>
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Source fetching</h2>
          <p className="muted" style={{ marginBottom: '1rem' }}>
            Fetch clips for a client (Twitch is live; YouTube is coming soon). Results are cached for 10 minutes unless you force refresh.
          </p>
          <div className="form">
            <div className="grid2">
              <label>
                <div className="label">Client</div>
                <select
                  value={sourcesClientId}
                  onChange={(e) => {
                    setSourcesClientId(e.target.value)
                    setClientSources([])
                  }}
                >
                  <option value="" disabled>Select client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <div className="label">Platform</div>
                <select
                  value={sourcesPlatform}
                  onChange={(e) => {
                    setSourcesPlatform(e.target.value)
                    setClientSources([])
                  }}
                >
                  <option value="twitch">Twitch (implemented)</option>
                  <option value="youtube">YouTube (coming soon)</option>
                </select>
              </label>
            </div>
            {sourcesPlatform === 'youtube' ? (
              <p className="muted" style={{ marginBottom: '0.5rem' }}>YouTube integration will be available in a future update.</p>
            ) : null}
            <div className="row" style={{ gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button
                type="button"
                className="primary"
                onClick={() => fetchSourcesForClient(sourcesClientId, sourcesPlatform, false)}
                disabled={clientSourcesLoading || !sourcesClientId || sourcesPlatform !== 'twitch'}
              >
                {clientSourcesLoading ? 'Fetching…' : 'Fetch sources'}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => fetchSourcesForClient(sourcesClientId, sourcesPlatform, true)}
                disabled={clientSourcesLoading || !sourcesClientId || sourcesPlatform !== 'twitch'}
              >
                Force refresh
              </button>
            </div>
            {clientSources.length > 0 ? (
              <SourceCardGrid
                sources={clientSources}
                onUseSource={(s) => createDeliverableFromSource(s, sourcesClientId)}
              />
            ) : null}
          </div>
        </section>
        </>
      ) : null}

      {activeTab === 'billing' ? (
        <>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Billing</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View totals and create invoices.</p>
          </div>
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Billing</h2>
          <div className="form">
            <div className="grid2">
              <label>
                <div className="label">Client (optional)</div>
                <select
                  value={billingFilters.client_id}
                  onChange={(e) => setBillingFilters((f) => ({ ...f, client_id: e.target.value }))}
                >
                  <option value="">All clients</option>
                  {clients.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <div className="label">Period start</div>
                <input
                  type="date"
                  value={billingFilters.period_start}
                  onChange={(e) => setBillingFilters((f) => ({ ...f, period_start: e.target.value }))}
                />
              </label>
              <label>
                <div className="label">Period end</div>
                <input
                  type="date"
                  value={billingFilters.period_end}
                  onChange={(e) => setBillingFilters((f) => ({ ...f, period_end: e.target.value }))}
                />
              </label>
              <div className="row" style={{ alignItems: 'end' }}>
                <button type="button" className="primary" onClick={refreshBilling}>Apply</button>
              </div>
            </div>
          </div>

          <div className="totalsGrid">
            <div className="totalCard">
              <div className="label">Paid total</div>
              <div className="totalValue">
                {billingTotals ? `$${Number(billingTotals.paid_total).toFixed(2)}` : '—'}
              </div>
            </div>
            <div className="totalCard">
              <div className="label">Unpaid total</div>
              <div className="totalValue">
                {billingTotals ? `$${Number(billingTotals.unpaid_total).toFixed(2)}` : '—'}
              </div>
            </div>
          </div>

          <h3 className="subhead">Create invoice</h3>
          <form className="form" onSubmit={onCreateInvoice}>
            <div className="grid2">
              <label>
                <div className="label">Client</div>
                <select
                  value={invoiceForm.client_id}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, client_id: e.target.value }))}
                  required
                >
                  <option value="" disabled>Select client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <div className="label">Label (optional)</div>
                <input
                  value={invoiceForm.label}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. March 2026"
                />
              </label>
              <label>
                <div className="label">Period start</div>
                <input
                  type="date"
                  value={invoiceForm.period_start}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, period_start: e.target.value }))}
                  required
                />
              </label>
              <label>
                <div className="label">Period end</div>
                <input
                  type="date"
                  value={invoiceForm.period_end}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, period_end: e.target.value }))}
                  required
                />
              </label>
            </div>
            <div className="row">
              <button type="submit" className="primary">Create invoice</button>
            </div>
          </form>

          <h3 className="subhead">Invoices</h3>
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Client</th>
                  <th>Period</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length ? (
                  invoices.map((inv) => {
                    const c = clientById.get(String(inv.client_id))
                    return (
                      <tr key={inv.id}>
                        <td className="strong">{inv.label}</td>
                        <td>{c ? c.name : `Client #${inv.client_id}`}</td>
                        <td className="muted">{`${inv.period_start} → ${inv.period_end}`}</td>
                        <td>${Number(inv.total_amount).toFixed(2)}</td>
                        <td className={inv.status === 'paid' ? 'ok' : 'muted'}>{inv.status}</td>
                        <td className="muted">{inv.created_at ? new Date(inv.created_at).toLocaleString() : ''}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="muted">No invoices yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        </>
      ) : null}
    </div>
  )
}
