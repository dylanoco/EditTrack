import './App.css'
import { useEffect, useMemo, useState } from 'react'
import {
  createClient,
  createDeliverable,
  fetchClients,
  fetchDeliverables,
} from './api.js'

function App() {
  const [activeTab, setActiveTab] = useState('clients')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const [clients, setClients] = useState([])
  const [deliverables, setDeliverables] = useState([])

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

  useEffect(() => {
    refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      </main>
    </>
  )
}

export default App
