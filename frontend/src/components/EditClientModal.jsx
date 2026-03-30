import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { updateClient } from '../api'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500'

export function EditClientModal({ client, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '', notes: '', twitch: '', youtube: '', discord: '',
    price_short: '', price_thumbnail: '', price_video: '',
    info_sections: [],
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
        info_sections: client.info_sections || [],
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
      await updateClient(client.id, {
        name: form.name.trim(),
        notes: form.notes.trim() || null,
        info_sections: form.info_sections.filter(s => s.title.trim() || s.body.trim()).map(s => ({ ...s, title: s.title.trim(), body: s.body.trim() })) || null,
        socials: Object.keys(socials).length ? socials : null,
        price_short: form.price_short !== '' ? Number(form.price_short) : null,
        price_thumbnail: form.price_thumbnail !== '' ? Number(form.price_thumbnail) : null,
        price_video: form.price_video !== '' ? Number(form.price_video) : null,
      })
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit client</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="max-h-[calc(90vh-140px)] overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">{error}</div>
          )}
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Client Name</span>
              <input required type="text" placeholder="e.g. NeroZYN" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
            </label>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Client Info</span>
              <div className="max-h-64 overflow-y-auto">
                {form.info_sections.map((section, i) => (
                  <div key={i} className="mb-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Category name (e.g. Preferences, Schedule)"
                        value={section.title}
                        onChange={(e) => {
                          const updated = [...form.info_sections]
                          updated[i] = { ...updated[i], title: e.target.value }
                          setForm((f) => ({ ...f, info_sections: updated }))
                        }}
                        className={inputClass}
                      />
                      <button type="button" onClick={() => {
                        setForm((f) => ({ ...f, info_sections: f.info_sections.filter((_, idx) => idx !== i) }))
                      }} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Details..."
                      value={section.body}
                      onChange={(e) => {
                        const updated = [...form.info_sections]
                        updated[i] = { ...updated[i], body: e.target.value }
                        setForm((f) => ({ ...f, info_sections: updated }))
                      }}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setForm((f) => ({ ...f, info_sections: [...f.info_sections, { id: crypto.randomUUID(), title: '', body: '' }] }))} className="mt-1 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400">
                + Add section
              </button>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
            <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Socials</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Twitch</span>
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
            <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Rates</h2>
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
          <button type="submit" disabled={submitting} className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50">
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  )
}
