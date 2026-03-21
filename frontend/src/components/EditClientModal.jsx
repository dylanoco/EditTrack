import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { updateClient } from '../api'

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400'

export function EditClientModal({ client, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '',
    notes: '',
    twitch: '',
    youtube: '',
    discord: '',
    price_short: '',
    price_thumbnail: '',
    price_video: '',
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name ?? '',
        notes: client.notes ?? '',
        twitch: client.socials?.twitch ?? '',
        youtube: client.socials?.youtube ?? '',
        discord: client.socials?.discord ?? '',
        price_short: client.price_short != null ? String(client.price_short) : '',
        price_thumbnail: client.price_thumbnail != null ? String(client.price_thumbnail) : '',
        price_video: client.price_video != null ? String(client.price_video) : '',
      })
    }
  }, [client])

  async function onSubmit(e) {
    e.preventDefault()
    if (!client) return
    setError(null)
    setSubmitting(true)
    try {
      const socials = {}
      if (form.twitch.trim()) socials.twitch = form.twitch.trim()
      if (form.youtube.trim()) socials.youtube = form.youtube.trim()
      if (form.discord.trim()) socials.discord = form.discord.trim()
      const payload = {
        name: form.name.trim(),
        notes: form.notes.trim() || null,
        socials: Object.keys(socials).length ? socials : null,
        price_short: form.price_short !== '' ? Number(form.price_short) : null,
        price_thumbnail: form.price_thumbnail !== '' ? Number(form.price_thumbnail) : null,
        price_video: form.price_video !== '' ? Number(form.price_video) : null,
      }
      await updateClient(client.id, payload)
      onSave()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (!client) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      style={{ left: 'var(--sidebar-width, 17.5rem)' }}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit client</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="max-h-[calc(90vh-140px)] overflow-y-auto p-6 space-y-6">
          {error ? (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          ) : null}

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Client Name</span>
              <input
                required
                type="text"
                placeholder="e.g. NeroZYN"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="block">
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

          <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
            <h2 className="mb-4 text-base font-bold text-gray-900 dark:text-white">Socials</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Twitch</span>
                <input
                  type="text"
                  placeholder="Streamer Name"
                  value={form.twitch}
                  onChange={(e) => setForm((f) => ({ ...f, twitch: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">YouTube</span>
                <input
                  type="text"
                  placeholder="Channel Name or URL"
                  value={form.youtube}
                  onChange={(e) => setForm((f) => ({ ...f, youtube: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Discord</span>
                <input
                  type="text"
                  placeholder="Username"
                  value={form.discord}
                  onChange={(e) => setForm((f) => ({ ...f, discord: e.target.value }))}
                  className={inputClass}
                />
              </label>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
            <h2 className="mb-4 text-base font-bold text-gray-900 dark:text-white">Rates</h2>
            <div className="grid grid-cols-3 gap-4">
              <label className="block">
                <span className="mb-1.5 block text-center text-sm font-medium text-gray-700 dark:text-gray-300">Thumbnail</span>
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
                <span className="mb-1.5 block text-center text-sm font-medium text-gray-700 dark:text-gray-300">Shorts</span>
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
                <span className="mb-1.5 block text-center text-sm font-medium text-gray-700 dark:text-gray-300">Videos</span>
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

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-800"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  )
}
