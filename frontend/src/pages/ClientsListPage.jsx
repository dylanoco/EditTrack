import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchClients } from '../api'
import { useSearch } from '../contexts/SearchContext'

export function ClientsListPage() {
  const navigate = useNavigate()
  const { query } = useSearch()
  const [clients, setClients] = useState([])
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Clients</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Open a client to create deliverables and view sources.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refresh}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            Refresh
          </button>
          <Link
            to="/clients/create"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            Create client
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Use the search bar above to filter clients.</p>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-gray-500 dark:text-gray-400">No clients yet.</div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{c.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {c.socials?.twitch ? `Twitch: ${c.socials.twitch}` : 'No Twitch set'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/clients/${c.id}`}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    Open client
                  </Link>
                  <button
                    type="button"
                    onClick={() => navigate(`/clients/${c.id}`)}
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
                  >
                    New deliverable
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
