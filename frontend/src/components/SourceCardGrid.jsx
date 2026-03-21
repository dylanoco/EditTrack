import { useMemo, useState } from 'react'
import { ExternalLink, FilePlus } from 'lucide-react'

const PAGE_SIZE = 12

const gridCols = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
}

export function SourceCardGrid({ sources, onUseSource, onOpenVideo, columns = 4, compact = false }) {
  const [page, setPage] = useState(0)
  const pageSize = columns === 3 ? 6 : PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(sources.length / pageSize))
  const paginated = useMemo(() => {
    const start = page * pageSize
    return sources.slice(start, start + pageSize)
  }, [sources, page, pageSize])

  if (sources.length === 0) return null

  const gridClass = gridCols[columns] ?? gridCols[4]

  const gridGap = columns === 3 ? 'gap-5' : 'gap-4'

  return (
    <div className="space-y-4">
      <div className={`grid ${gridGap} ${gridClass}`}>
        {paginated.map((s) => (
          <div
            key={s.id}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="aspect-video min-h-[100px] bg-gray-100 dark:bg-gray-700">
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
            <div className={compact ? 'p-3' : 'space-y-3 p-4'}>
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white" title={s.title}>
                {s.title || 'Untitled'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {s.duration_sec != null ? `${s.duration_sec}s` : '—'}
              </p>
              <div className={compact ? 'mt-2 flex gap-2' : 'flex flex-wrap gap-2'}>
                {onUseSource && (
                  <button
                    type="button"
                    onClick={() => onUseSource(s)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 font-medium text-white hover:bg-violet-700 ${compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2.5 text-sm'}`}
                  >
                    <FilePlus className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                    Use Source
                  </button>
                )}
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 ${compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2.5 text-sm'}`}
                    onClick={onOpenVideo}
                  >
                    <ExternalLink className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
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
