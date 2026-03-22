import './App.css'
import { useEffect, useMemo, useState } from 'react'
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
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    refreshClients()
  }, [])

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

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : null}

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
    </div>
  )
}
