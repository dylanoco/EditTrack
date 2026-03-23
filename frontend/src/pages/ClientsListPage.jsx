import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Users } from 'lucide-react'
import { fetchClients } from '../api'
import { EditClientModal } from '../components/EditClientModal'
import { useSearch } from '../contexts/SearchContext'

export function ClientsListPage() {
  const navigate = useNavigate()
  const { query } = useSearch()
  const [clients, setClients] = useState([])
  const [editingClient, setEditingClient] = useState(null)
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

  useEffect(() => { refresh() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) => c.name.toLowerCase().includes(q))
  }, [clients, query])

  return (
    <div className="space-y-6" data-tour="clients">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Clients</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your clients and their deliverables.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refresh}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link
            to="/clients/create"
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" /> Create client
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Users className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm text-slate-500">No clients yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                onClick={() => navigate(`/clients/${c.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-sm font-bold text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
                    {c.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{c.name}</p>
                    <p className="text-xs text-slate-400">
                      {c.socials?.twitch ? `Twitch: ${c.socials.twitch}` : 'No Twitch set'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setEditingClient(c)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Edit
                  </button>
                  <Link
                    to={`/billing?client_id=${c.id}`}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    Invoice
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingClient && (
        <EditClientModal
          client={editingClient}
          onSave={() => refresh()}
          onClose={() => setEditingClient(null)}
        />
      )}
    </div>
  )
}
