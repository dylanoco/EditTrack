import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createClient, fetchClients } from '../api'

const initialForm = {
  name: '',
  twitch: '',
  youtube: '',
  discord: '',
  price_short: 20,
  price_thumbnail: 10,
  price_video: 50,
  notes: '',
}

export function ClientsPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [form, setForm] = useState(initialForm)
  const [query, setQuery] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchClients()
      setClients(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) => c.name.toLowerCase().includes(q))
  }, [clients, query])

  async function onCreate(e) {
    e.preventDefault()
    setError(null)
    try {
      const socials = {}
      if (form.twitch.trim()) socials.twitch = form.twitch.trim()
      if (form.youtube.trim()) socials.youtube = form.youtube.trim()
      if (form.discord.trim()) socials.discord = form.discord.trim()
      await createClient({
        name: form.name.trim(),
        notes: form.notes.trim() || null,
        socials: Object.keys(socials).length ? socials : null,
        price_short: Number(form.price_short),
        price_thumbnail: Number(form.price_thumbnail),
        price_video: Number(form.price_video),
      })
      setForm(initialForm)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Clients</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Open a client and create deliverables quickly.</p>
        </div>
        <button type="button" onClick={refresh} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800">
          Refresh
        </button>
      </div>

      {error ? <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div> : null}

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">New client</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onCreate}>
          <input required placeholder="Client name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700" />
          <input placeholder="Twitch channel" value={form.twitch} onChange={(e) => setForm((f) => ({ ...f, twitch: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700" />
          <input placeholder="YouTube channel" value={form.youtube} onChange={(e) => setForm((f) => ({ ...f, youtube: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700" />
          <input placeholder="Discord" value={form.discord} onChange={(e) => setForm((f) => ({ ...f, discord: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700" />
          <input type="number" step="0.01" placeholder="Price short" value={form.price_short} onChange={(e) => setForm((f) => ({ ...f, price_short: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700" />
          <input type="number" step="0.01" placeholder="Price thumbnail" value={form.price_thumbnail} onChange={(e) => setForm((f) => ({ ...f, price_thumbnail: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700" />
          <input type="number" step="0.01" placeholder="Price video" value={form.price_video} onChange={(e) => setForm((f) => ({ ...f, price_video: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700" />
          <input placeholder="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700" />
          <div className="md:col-span-2">
            <button type="submit" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">Create client</button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Client list</h2>
          <input placeholder="Search clients..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-60 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700" />
        </div>
        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No clients yet.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{c.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{c.socials?.twitch ? `twitch: ${c.socials.twitch}` : 'No twitch set'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/clients/${c.id}`} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">Open client</Link>
                  <button type="button" onClick={() => navigate(`/clients/${c.id}`)} className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-700">New deliverable</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
