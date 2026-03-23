import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '../api'
import { useNotifications } from '../contexts/NotificationsContext'
import { InfoTip } from '../components/Tooltip'

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
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500'

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link to="/clients" className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400">
        <ArrowLeft className="h-4 w-4" /> Back to clients
      </Link>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900" data-tour="create-client">
        <form onSubmit={onSubmit} className="space-y-6">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Create a Client</h1>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Client Name</span>
              <input required type="text" placeholder="e.g. NeroZYN" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</span>
              <textarea rows={3} placeholder="Optional notes about this client" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={`${inputClass} resize-none`} />
            </label>
          </div>

          <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
            <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Socials</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Twitch<InfoTip content="Used by Fetch Sources to pull recent Twitch clips for this client." /></span>
                <input type="text" placeholder="Streamer Name" value={form.twitch} onChange={(e) => setForm((f) => ({ ...f, twitch: e.target.value }))} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">YouTube</span>
                <input type="text" placeholder="Channel Name or URL" value={form.youtube} onChange={(e) => setForm((f) => ({ ...f, youtube: e.target.value }))} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Discord</span>
                <input type="text" placeholder="Username" value={form.discord} onChange={(e) => setForm((f) => ({ ...f, discord: e.target.value }))} className={inputClass} />
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
            <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Rates<InfoTip content="Default per-type pricing for this client. Used when a deliverable's price mode is set to 'Auto'." /></h2>
            <div className="grid grid-cols-3 gap-4">
              <label className="block">
                <span className="mb-1.5 block text-center text-sm font-medium text-slate-700 dark:text-slate-300">Thumbnail</span>
                <input type="number" step="0.01" min="0" value={form.price_thumbnail} onChange={(e) => setForm((f) => ({ ...f, price_thumbnail: e.target.value }))} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-center text-sm font-medium text-slate-700 dark:text-slate-300">Shorts</span>
                <input type="number" step="0.01" min="0" value={form.price_short} onChange={(e) => setForm((f) => ({ ...f, price_short: e.target.value }))} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-center text-sm font-medium text-slate-700 dark:text-slate-300">Videos</span>
                <input type="number" step="0.01" min="0" value={form.price_video} onChange={(e) => setForm((f) => ({ ...f, price_video: e.target.value }))} className={inputClass} />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Client'}
          </button>
        </form>
      </div>
    </div>
  )
}
