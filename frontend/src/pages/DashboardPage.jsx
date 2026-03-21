import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { fetchClients, fetchDashboardOverview, fetchDeliverables } from '../api'

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend)

export function DashboardPage() {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = new Date()
  monthStart.setDate(1)
  const [filters, setFilters] = useState({
    client_id: '',
    period_start: monthStart.toISOString().slice(0, 10),
    period_end: today,
  })
  const [clients, setClients] = useState([])
  const [overview, setOverview] = useState(null)
  const [deliverables, setDeliverables] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const [cs, data, dels] = await Promise.all([
        fetchClients(),
        fetchDashboardOverview({
          client_id: filters.client_id ? Number(filters.client_id) : undefined,
          period_start: filters.period_start || undefined,
          period_end: filters.period_end || undefined,
        }),
        fetchDeliverables({ archived: false }),
      ])
      setClients(cs)
      setOverview(data)
      setDeliverables(dels)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const trendData = useMemo(() => {
    const trend = overview?.trend || []
    return {
      labels: trend.map((t) => t.bucket),
      datasets: [
        {
          label: 'Paid',
          data: trend.map((t) => t.paid_total),
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Unpaid',
          data: trend.map((t) => t.unpaid_total),
          borderColor: 'rgb(220, 38, 38)',
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          fill: true,
          tension: 0.3,
        },
      ],
    }
  }, [overview])

  const deliverablesCount =
    overview?.client_rankings?.reduce((s, r) => s + (r.count_deliverables || 0), 0) ?? 0
  const clientsCount = overview?.client_rankings?.length ?? 0

  const recentDeliverables = deliverables.slice(0, 5)

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard</h1>
      <div className="flex w-fit flex-row items-center gap-2">
        <select
          value={filters.client_id}
          onChange={(e) => setFilters((f) => ({ ...f, client_id: e.target.value }))}
          className="w-28 rounded border border-gray-300 bg-white px-1.5 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filters.period_start}
          onChange={(e) => setFilters((f) => ({ ...f, period_start: e.target.value }))}
          className="w-28 rounded border border-gray-300 bg-white px-1.5 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        <input
          type="date"
          value={filters.period_end}
          onChange={(e) => setFilters((f) => ({ ...f, period_end: e.target.value }))}
          className="w-28 rounded border border-gray-300 bg-white px-1.5 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
        <button
          type="button"
          onClick={refresh}
          className="rounded border-0 bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-700"
        >
          Apply
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading dashboard…</p>
      ) : overview ? (
        <>
          {/* HERO — Revenue block (tighter grouping) */}
          <section className="space-y-2 py-1">
            <p className="text-5xl font-bold tracking-tight text-gray-900 dark:text-white md:text-6xl">
              ${overview.total_revenue?.toFixed(2) ?? '0.00'}
            </p>
            <p className="text-base font-medium text-gray-500 dark:text-gray-400">
              Revenue this month
            </p>
            <div className="flex gap-6 text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                Paid: <span className="font-semibold text-green-600 dark:text-green-400">${overview.paid_total?.toFixed(2) ?? '0.00'}</span>
              </span>
              <span className="text-gray-600 dark:text-gray-300">
                Unpaid: <span className="font-semibold text-amber-600 dark:text-amber-400">${overview.unpaid_total?.toFixed(2) ?? '0.00'}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-0.5 pt-1 text-sm text-gray-600 dark:text-gray-400">
              <span>Deliverables: <strong className="text-gray-900 dark:text-white">{deliverablesCount}</strong></span>
              <span>Clients: <strong className="text-gray-900 dark:text-white">{clientsCount}</strong></span>
              <span>Unpaid: <strong className="text-gray-900 dark:text-white">{overview.unpaid_deliverables_count ?? 0}</strong></span>
            </div>
          </section>

          {/* Chart — middle, clean */}
          <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Revenue trend
            </h2>
            {overview.trend?.length ? (
              <div className="h-28">
                <Line
                  data={trendData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
                    },
                    scales: {
                      x: { ticks: { maxTicksLimit: 6 } },
                      y: { beginAtZero: true },
                    },
                  }}
                />
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No trend data in selected range.
              </p>
            )}
          </section>

          {/* Recent Deliverables — MEDIUM, dominant, full width */}
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Deliverables
              </h2>
              <Link
                to="/deliverables"
                className="text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
              >
                See all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50">
                    <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Title
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Client
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Type
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {recentDeliverables.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                        No deliverables yet.
                      </td>
                    </tr>
                  ) : (
                    recentDeliverables.map((d) => (
                      <tr
                        key={d.id}
                        className="cursor-default transition-colors hover:bg-violet-50/50 dark:hover:bg-violet-900/10"
                      >
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {d.title || 'Untitled'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                          {clients.find((c) => c.id === d.client_id)?.name ?? '—'}
                        </td>
                        <td className="px-6 py-4 text-sm capitalize text-gray-600 dark:text-gray-300">
                          {d.type ?? '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              d.payment_status === 'paid'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : d.payment_status === 'partial'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {d.payment_status ?? '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                          {d.price_value != null ? `$${Number(d.price_value).toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Insights — compact, bottom */}
          <section className="rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3.5 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Top Insights
            </p>
            <div className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1.5 text-sm md:text-base">
              <span className="text-gray-700 dark:text-gray-300">
                Top client: <strong className="text-gray-900 dark:text-white">{overview.top_client_payer?.client_name || '—'}</strong>
                {overview.top_client_payer ? ` — $${overview.top_client_payer.total?.toFixed(2)}` : ''}
              </span>
              <span className="text-gray-700 dark:text-gray-300">
                Best deliverable: <strong className="text-gray-900 dark:text-white">
                  {overview.best_pay_per_deliverable_client ? `$${overview.best_pay_per_deliverable_client.avg_per_deliverable?.toFixed(2) ?? '0.00'}` : '—'}
                </strong>
                {overview.best_pay_per_deliverable_client ? ` (${overview.best_pay_per_deliverable_client.client_name})` : ''}
              </span>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
