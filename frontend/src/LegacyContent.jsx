import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchClients, syncClientSources } from './api.js'
import { SourceCardGrid } from './components/SourceCardGrid'
import { useNotifications } from './contexts/NotificationsContext'

export function LegacyContent({ activeTab }) {
  const navigate = useNavigate()
  const { addNotification } = useNotifications()
  const [error, setError] = useState(null)
  const [clients, setClients] = useState([])
  const [clientSources, setClientSources] = useState([])
  const [clientSourcesLoading, setClientSourcesLoading] = useState(false)
  const [sourcesClientId, setSourcesClientId] = useState('')
  const [sourcesPlatform, setSourcesPlatform] = useState('twitch')

  async function refreshClients() {
    setError(null)
    try {
      const c = await fetchClients()
      setClients(c)
      if (c.length && !sourcesClientId) setSourcesClientId(String(c[0].id))
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }

  useEffect(() => { refreshClients() }, [])
  useEffect(() => { if (activeTab === 'sources' && clients.length && !sourcesClientId) setSourcesClientId(String(clients[0].id)) }, [activeTab, clients, sourcesClientId])

  async function fetchSourcesForClient(clientId, platform, force = false) {
    if (!clientId || platform !== 'twitch') { setError(platform !== 'twitch' ? 'YouTube not available yet.' : 'Select a client first.'); return }
    setError(null); setClientSourcesLoading(true)
    try {
      const list = await syncClientSources(Number(clientId), 'twitch', force)
      addNotification({ type: 'success', title: 'Sources synced', message: `Fetched ${list.length} Twitch clip(s)` })
      setClientSources(list)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); setClientSources([]) } finally { setClientSourcesLoading(false) }
  }

  function createDeliverableFromSource(source, clientId) {
    navigate('/deliverables/create', { state: { source, clientId: Number(clientId) } })
  }

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500'

  return (
    <div className="space-y-6" data-tour="sources">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}

      {activeTab === 'sources' && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sources</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Fetch Twitch clips for clients and create deliverables from them.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Source fetching</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Fetch clips for a client (Twitch is live; YouTube is coming soon). Results are cached for 10 minutes unless you force refresh.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Client</span>
                <select
                  value={sourcesClientId}
                  onChange={(e) => { setSourcesClientId(e.target.value); setClientSources([]) }}
                  className={inputClass}
                >
                  <option value="" disabled>Select client...</option>
                  {clients.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Platform</span>
                <select
                  value={sourcesPlatform}
                  onChange={(e) => { setSourcesPlatform(e.target.value); setClientSources([]) }}
                  className={inputClass}
                >
                  <option value="twitch">Twitch (implemented)</option>
                  <option value="youtube">YouTube (coming soon)</option>
                </select>
              </label>
            </div>

            {sourcesPlatform === 'youtube' && (
              <p className="text-sm text-slate-400 mb-4">YouTube integration will be available in a future update.</p>
            )}

            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => fetchSourcesForClient(sourcesClientId, sourcesPlatform, false)}
                disabled={clientSourcesLoading || !sourcesClientId || sourcesPlatform !== 'twitch'}
                className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clientSourcesLoading ? 'Fetching...' : 'Fetch sources'}
              </button>
              <button
                type="button"
                onClick={() => fetchSourcesForClient(sourcesClientId, sourcesPlatform, true)}
                disabled={clientSourcesLoading || !sourcesClientId || sourcesPlatform !== 'twitch'}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Force refresh
              </button>
            </div>

            {clientSources.length > 0 && (
              <SourceCardGrid
                sources={clientSources}
                onUseSource={(s) => createDeliverableFromSource(s, sourcesClientId)}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
