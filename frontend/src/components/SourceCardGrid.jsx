import { useMemo, useState } from 'react'
import { ExternalLink, FilePlus } from 'lucide-react'

const PAGE_SIZE = 12

export function SourceCardGrid({ sources, onUseSource, onOpenVideo }) {
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(sources.length / PAGE_SIZE))
  const paginated = useMemo(() => {
    const start = page * PAGE_SIZE
    return sources.slice(start, start + PAGE_SIZE)
  }, [sources, page])

  if (sources.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {paginated.map((s) => (
          <div
            key={s.id}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="aspect-video bg-gray-100 dark:bg-gray-700">
              {s.thumbnail_url ? (
                <img
                  src={s.thumbnail_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">
                  <span className="text-sm">No thumbnail</span>
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white" title={s.title}>
                {s.title || 'Untitled'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {s.duration_sec != null ? `${s.duration_sec}s` : '—'}
              </p>
              <div className="mt-2 flex gap-2">
                {onUseSource && (
                  <button
                    type="button"
                    onClick={() => onUseSource(s)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
                  >
                    <FilePlus className="h-3.5 w-3.5" />
                    Create deliverable
                  </button>
                )}
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-2 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                    onClick={onOpenVideo}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open video
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-gray-600"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
