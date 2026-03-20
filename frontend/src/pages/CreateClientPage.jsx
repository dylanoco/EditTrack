import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createClient } from '../api'
import { useNotifications } from '../contexts/NotificationsContext'

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

export function CreateClientPage() {
  const navigate = useNavigate()
  const { addNotification } = useNotifications()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const socials = {}
      if (form.twitch.trim()) socials.twitch = form.twitch.trim()
      if (form.youtube.trim()) socials.youtube = form.youtube.trim()
      if (form.discord.trim()) socials.discord = form.discord.trim()
      const client = await createClient({
        name: form.name.trim(),
        notes: form.notes.trim() || null,
        socials: Object.keys(socials).length ? socials : null,
        price_short: Number(form.price_short),
        price_thumbnail: Number(form.price_thumbnail),
        price_video: Number(form.price_video),
      })
      addNotification({ type: 'success', title: 'Client created', message: form.name.trim() })
      navigate(`/clients/${client.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Create Client</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            <Link to="/clients" className="text-violet-600 hover:text-violet-700 dark:text-violet-400">
              Back to clients
            </Link>
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <form onSubmit={onSubmit} className="p-6 space-y-8">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Basic information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Client name</span>
                <input
                  required
                  type="text"
                  placeholder="e.g. Acme Streaming"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</span>
                <textarea
                  rows={3}
                  placeholder="Optional notes about this client"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className={`${inputClass} resize-none`}
                />
              </label>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Social links</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Twitch channel</span>
                <input
                  type="text"
                  placeholder="streamer_name"
                  value={form.twitch}
                  onChange={(e) => setForm((f) => ({ ...f, twitch: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">YouTube channel</span>
                <input
                  type="text"
                  placeholder="channel name or URL"
                  value={form.youtube}
                  onChange={(e) => setForm((f) => ({ ...f, youtube: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Discord</span>
                <input
                  type="text"
                  placeholder="username or server"
                  value={form.discord}
                  onChange={(e) => setForm((f) => ({ ...f, discord: e.target.value }))}
                  className={inputClass}
                />
              </label>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Default rates</h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Default prices for new deliverables. Can be overridden per deliverable.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Short ($)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price_short}
                  onChange={(e) => setForm((f) => ({ ...f, price_short: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Thumbnail ($)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price_thumbnail}
                  onChange={(e) => setForm((f) => ({ ...f, price_thumbnail: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Video ($)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price_video}
                  onChange={(e) => setForm((f) => ({ ...f, price_video: e.target.value }))}
                  className={inputClass}
                />
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create client'}
            </button>
            <Link
              to="/clients"
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
