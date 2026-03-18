import './App.css'
import { useEffect, useMemo, useState } from 'react'
import {
  createClient,
  createDeliverable,
  createInvoice,
  fetchBillingTotals,
  fetchClients,
  fetchDeliverables,
  fetchInvoices,
} from './api.js'

function App() {
  const [activeTab, setActiveTab] = useState('clients')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const [clients, setClients] = useState([])
  const [deliverables, setDeliverables] = useState([])
  const [invoices, setInvoices] = useState([])
  const [billingTotals, setBillingTotals] = useState(null)

  const [clientForm, setClientForm] = useState({
    name: '',
    twitch: '',
    youtube: '',
    discord: '',
    price_short: 20,
    price_thumbnail: 10,
    price_video: 50,
    notes: '',
  })

  const [deliverableForm, setDeliverableForm] = useState({
    client_id: '',
    type: 'short',
    title: '',
    description: '',
    source_url: '',
    status: 'incomplete',
    price_mode: 'auto',
    price_value: '',
  })

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

  async function refreshAll() {
    setError(null)
    setLoading(true)
    try {
      const [c, d] = await Promise.all([fetchClients(), fetchDeliverables()])
      setClients(c)
      setDeliverables(d)
      if (c.length && !deliverableForm.client_id) {
        setDeliverableForm((f) => ({ ...f, client_id: String(c[0].id) }))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
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
        fetchInvoices({
          client_id: billingFilters.client_id ? Number(billingFilters.client_id) : undefined,
        }),
      ])
      setBillingTotals(totals)
      setInvoices(invs)
      if (clients.length && !invoiceForm.client_id) {
        setInvoiceForm((f) => ({ ...f, client_id: String(clients[0].id) }))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeTab === 'billing') refreshBilling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  async function onCreateClient(e) {
    e.preventDefault()
    setError(null)
    try {
      const socials = {}
      if (clientForm.twitch?.trim()) socials.twitch = clientForm.twitch.trim()
      if (clientForm.youtube?.trim()) socials.youtube = clientForm.youtube.trim()
      if (clientForm.discord?.trim()) socials.discord = clientForm.discord.trim()

      const payload = {
        name: clientForm.name.trim(),
        price_short: Number(clientForm.price_short),
        price_thumbnail: Number(clientForm.price_thumbnail),
        price_video: Number(clientForm.price_video),
        notes: clientForm.notes?.trim() || null,
        socials: Object.keys(socials).length ? socials : null,
      }
      if (!payload.name) throw new Error('Client name is required')

      const created = await createClient(payload)
      await refreshAll()
      setActiveTab('clients')
      setClientForm((f) => ({
        ...f,
        name: '',
        twitch: '',
        youtube: '',
        discord: '',
        notes: '',
      }))
      setDeliverableForm((f) =>
        f.client_id ? f : { ...f, client_id: String(created.id) },
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function onCreateDeliverable(e) {
    e.preventDefault()
    setError(null)
    try {
      const payload = {
        client_id: Number(deliverableForm.client_id),
        type: deliverableForm.type,
        title: deliverableForm.title.trim(),
        description: deliverableForm.description?.trim() || null,
        source_url: deliverableForm.source_url?.trim() || null,
        status: deliverableForm.status,
        price_mode: deliverableForm.price_mode,
      }
      if (!payload.client_id) throw new Error('Client is required')
      if (!payload.title) throw new Error('Deliverable title is required')
      if (payload.price_mode === 'override') {
        const val = deliverableForm.price_value
        if (val === '' || val == null) throw new Error('Manual price is required when using override pricing')
        payload.price_value = Number(val)
      }

      await createDeliverable(payload)
      await refreshAll()
      setActiveTab('deliverables')
      setDeliverableForm((f) => ({
        ...f,
        title: '',
        description: '',
        source_url: '',
        price_value: '',
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
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
      if (!payload.period_start || !payload.period_end) {
        throw new Error('Date range is required')
      }
      await createInvoice(payload)
      await refreshBilling()
      setInvoiceForm((f) => ({ ...f, label: '' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <div className="brandMark" aria-hidden="true" />
          <div>
            <div className="brandName">Editor Tracker</div>
            <div className="brandSub">MVP CRUD dashboard</div>
          </div>
        </div>
        <nav className="tabs" aria-label="Sections">
          <button
            type="button"
            className={activeTab === 'clients' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('clients')}
          >
            Clients
          </button>
          <button
            type="button"
            className={activeTab === 'deliverables' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('deliverables')}
          >
            Deliverables
          </button>
          <button
            type="button"
            className={activeTab === 'billing' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('billing')}
          >
            Billing
          </button>
        </nav>
        <button type="button" className="ghost" onClick={refreshAll}>
          Refresh
        </button>
      </header>

      <main className="container">
        {error ? <div className="alert">{error}</div> : null}
        {loading ? <div className="muted">Loading…</div> : null}

        {activeTab === 'clients' ? (
          <section className="card">
            <h2>Clients</h2>

            <form className="form" onSubmit={onCreateClient}>
              <div className="grid2">
                <label>
                  <div className="label">Name</div>
                  <input
                    value={clientForm.name}
                    onChange={(e) =>
                      setClientForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. Streamer A"
                    required
                  />
                </label>

                <label>
                  <div className="label">Notes</div>
                  <input
                    value={clientForm.notes}
                    onChange={(e) =>
                      setClientForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    placeholder="optional"
                  />
                </label>

                <label>
                  <div className="label">Twitch</div>
                  <input
                    value={clientForm.twitch}
                    onChange={(e) =>
                      setClientForm((f) => ({ ...f, twitch: e.target.value }))
                    }
                    placeholder="optional"
                  />
                </label>

                <label>
                  <div className="label">YouTube</div>
                  <input
                    value={clientForm.youtube}
                    onChange={(e) =>
                      setClientForm((f) => ({ ...f, youtube: e.target.value }))
                    }
                    placeholder="optional"
                  />
                </label>

                <label>
                  <div className="label">Discord</div>
                  <input
                    value={clientForm.discord}
                    onChange={(e) =>
                      setClientForm((f) => ({ ...f, discord: e.target.value }))
                    }
                    placeholder="optional"
                  />
                </label>

                <label>
                  <div className="label">Price: Short</div>
                  <input
                    type="number"
                    step="0.01"
                    value={clientForm.price_short}
                    onChange={(e) =>
                      setClientForm((f) => ({
                        ...f,
                        price_short: e.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  <div className="label">Price: Thumbnail</div>
                  <input
                    type="number"
                    step="0.01"
                    value={clientForm.price_thumbnail}
                    onChange={(e) =>
                      setClientForm((f) => ({
                        ...f,
                        price_thumbnail: e.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  <div className="label">Price: Video</div>
                  <input
                    type="number"
                    step="0.01"
                    value={clientForm.price_video}
                    onChange={(e) =>
                      setClientForm((f) => ({
                        ...f,
                        price_video: e.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="row">
                <button type="submit" className="primary">
                  Create client
                </button>
              </div>
            </form>

            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Socials</th>
                    <th>Short</th>
                    <th>Thumb</th>
                    <th>Video</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.length ? (
                    clients.map((c) => (
                      <tr key={c.id}>
                        <td className="strong">{c.name}</td>
                        <td className="muted socialsCell">
                          {c.socials && typeof c.socials === 'object'
                            ? [c.socials.twitch && 'Twitch', c.socials.youtube && 'YouTube', c.socials.discord && 'Discord']
                                .filter(Boolean)
                                .join(', ') || '—'
                            : '—'}
                        </td>
                        <td>${Number(c.price_short).toFixed(2)}</td>
                        <td>${Number(c.price_thumbnail).toFixed(2)}</td>
                        <td>${Number(c.price_video).toFixed(2)}</td>
                        <td className="muted">{c.notes || ''}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="muted">
                        No clients yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === 'deliverables' ? (
          <section className="card">
            <h2>Deliverables</h2>

            <form className="form" onSubmit={onCreateDeliverable}>
              <div className="grid2">
                <label>
                  <div className="label">Client</div>
                  <select
                    value={deliverableForm.client_id}
                    onChange={(e) =>
                      setDeliverableForm((f) => ({
                        ...f,
                        client_id: e.target.value,
                      }))
                    }
                    required
                  >
                    <option value="" disabled>
                      Select client…
                    </option>
                    {clients.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <div className="label">Type</div>
                  <select
                    value={deliverableForm.type}
                    onChange={(e) =>
                      setDeliverableForm((f) => ({
                        ...f,
                        type: e.target.value,
                      }))
                    }
                  >
                    <option value="short">Short</option>
                    <option value="thumbnail">Thumbnail</option>
                    <option value="video">Video</option>
                  </select>
                </label>

                <label className="span2">
                  <div className="label">Title</div>
                  <input
                    value={deliverableForm.title}
                    onChange={(e) =>
                      setDeliverableForm((f) => ({ ...f, title: e.target.value }))
                    }
                    placeholder="e.g. Clip highlights #12"
                    required
                  />
                </label>

                <label className="span2">
                  <div className="label">Description</div>
                  <input
                    value={deliverableForm.description}
                    onChange={(e) =>
                      setDeliverableForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    placeholder="optional"
                  />
                </label>

                <label className="span2">
                  <div className="label">Source URL</div>
                  <input
                    type="url"
                    value={deliverableForm.source_url}
                    onChange={(e) =>
                      setDeliverableForm((f) => ({
                        ...f,
                        source_url: e.target.value,
                      }))
                    }
                    placeholder="VoD or clip URL (optional)"
                  />
                </label>

                <label>
                  <div className="label">Status</div>
                  <select
                    value={deliverableForm.status}
                    onChange={(e) =>
                      setDeliverableForm((f) => ({
                        ...f,
                        status: e.target.value,
                      }))
                    }
                  >
                    <option value="incomplete">Incomplete</option>
                    <option value="complete">Complete</option>
                  </select>
                </label>

                <label>
                  <div className="label">Pricing</div>
                  <select
                    value={deliverableForm.price_mode}
                    onChange={(e) =>
                      setDeliverableForm((f) => ({
                        ...f,
                        price_mode: e.target.value,
                      }))
                    }
                  >
                    <option value="auto">Auto (client rate)</option>
                    <option value="override">Override (manual $)</option>
                  </select>
                </label>

                {deliverableForm.price_mode === 'override' ? (
                  <label>
                    <div className="label">Manual price ($)</div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={deliverableForm.price_value}
                      onChange={(e) =>
                        setDeliverableForm((f) => ({
                          ...f,
                          price_value: e.target.value,
                        }))
                      }
                      placeholder="e.g. 25"
                      required={deliverableForm.price_mode === 'override'}
                    />
                  </label>
                ) : null}
              </div>

              <div className="row">
                <button type="submit" className="primary">
                  Create deliverable
                </button>
              </div>
            </form>

            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Price</th>
                    <th>Source URL</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {deliverables.length ? (
                    deliverables.map((d) => {
                      const c = clientById.get(String(d.client_id))
                      return (
                        <tr key={d.id}>
                          <td className="strong">{d.title}</td>
                          <td>{c ? c.name : `Client #${d.client_id}`}</td>
                          <td className="pill">{d.type}</td>
                          <td className={d.status === 'complete' ? 'ok' : 'muted'}>
                            {d.status}
                          </td>
                          <td>
                            {d.price_value != null
                              ? `$${Number(d.price_value).toFixed(2)}`
                              : ''}
                          </td>
                          <td className="muted sourceUrlCell">
                            {d.source_url ? (
                              <a href={d.source_url} target="_blank" rel="noopener noreferrer">
                                Link
                              </a>
                            ) : '—'}
                          </td>
                          <td className="muted">
                            {d.created_at ? new Date(d.created_at).toLocaleString() : ''}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="muted">
                        No deliverables yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === 'billing' ? (
          <section className="card">
            <h2>Billing</h2>

            <div className="form">
              <div className="grid2">
                <label>
                  <div className="label">Client (optional)</div>
                  <select
                    value={billingFilters.client_id}
                    onChange={(e) =>
                      setBillingFilters((f) => ({ ...f, client_id: e.target.value }))
                    }
                  >
                    <option value="">All clients</option>
                    {clients.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <div className="label">Period start</div>
                  <input
                    type="date"
                    value={billingFilters.period_start}
                    onChange={(e) =>
                      setBillingFilters((f) => ({
                        ...f,
                        period_start: e.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  <div className="label">Period end</div>
                  <input
                    type="date"
                    value={billingFilters.period_end}
                    onChange={(e) =>
                      setBillingFilters((f) => ({
                        ...f,
                        period_end: e.target.value,
                      }))
                    }
                  />
                </label>

                <div className="row" style={{ alignItems: 'end' }}>
                  <button type="button" className="primary" onClick={refreshBilling}>
                    Apply
                  </button>
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
                    onChange={(e) =>
                      setInvoiceForm((f) => ({ ...f, client_id: e.target.value }))
                    }
                    required
                  >
                    <option value="" disabled>
                      Select client…
                    </option>
                    {clients.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <div className="label">Label (optional)</div>
                  <input
                    value={invoiceForm.label}
                    onChange={(e) =>
                      setInvoiceForm((f) => ({ ...f, label: e.target.value }))
                    }
                    placeholder="e.g. March 2026"
                  />
                </label>

                <label>
                  <div className="label">Period start</div>
                  <input
                    type="date"
                    value={invoiceForm.period_start}
                    onChange={(e) =>
                      setInvoiceForm((f) => ({ ...f, period_start: e.target.value }))
                    }
                    required
                  />
                </label>

                <label>
                  <div className="label">Period end</div>
                  <input
                    type="date"
                    value={invoiceForm.period_end}
                    onChange={(e) =>
                      setInvoiceForm((f) => ({ ...f, period_end: e.target.value }))
                    }
                    required
                  />
                </label>
              </div>

              <div className="row">
                <button type="submit" className="primary">
                  Create invoice
                </button>
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
                      const period = `${inv.period_start} → ${inv.period_end}`
                      return (
                        <tr key={inv.id}>
                          <td className="strong">{inv.label}</td>
                          <td>{c ? c.name : `Client #${inv.client_id}`}</td>
                          <td className="muted">{period}</td>
                          <td>${Number(inv.total_amount).toFixed(2)}</td>
                          <td className={inv.status === 'paid' ? 'ok' : 'muted'}>
                            {inv.status}
                          </td>
                          <td className="muted">
                            {inv.created_at ? new Date(inv.created_at).toLocaleString() : ''}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="muted">
                        No invoices yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </main>
    </>
  )
}

export default App
