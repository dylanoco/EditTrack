import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Filler,
} from 'chart.js'
import {
  ArrowDown,
  ArrowUp,
  Clock,
  DollarSign,
  FileText,
  TrendingUp,
  Users,
} from 'lucide-react'
import { fetchClients, fetchDashboardOverview, fetchDeliverables } from '../api'
import { InfoTip } from '../components/Tooltip'

ChartJS.register(
  ArcElement, BarController, BarElement, CategoryScale,
  DoughnutController, Legend, LinearScale, LineElement,
  PointElement, Tooltip, Filler
)

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const [cs, data] = await Promise.all([
        fetchClients(),
        fetchDashboardOverview({
          client_id: filters.client_id ? Number(filters.client_id) : undefined,
          period_start: filters.period_start || undefined,
          period_end: filters.period_end || undefined,
        }),
      ])
      setClients(cs)
      setOverview(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

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
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: 'rgb(139, 92, 246)',
        },
        {
          label: 'Unpaid',
          data: trend.map((t) => t.unpaid_total),
          borderColor: 'rgb(251, 191, 36)',
          backgroundColor: 'rgba(251, 191, 36, 0.08)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: 'rgb(251, 191, 36)',
        },
      ],
    }
  }, [overview])

  const typeChartData = useMemo(() => {
    const byType = overview?.deliverables_by_type || {}
    return {
      labels: ['Short', 'Thumbnail', 'Video'],
      datasets: [{
        data: [byType.short || 0, byType.thumbnail || 0, byType.video || 0],
        backgroundColor: ['rgba(139, 92, 246, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(251, 191, 36, 0.8)'],
        borderColor: ['rgb(139, 92, 246)', 'rgb(59, 130, 246)', 'rgb(251, 191, 36)'],
        borderWidth: 2,
        hoverOffset: 6,
      }],
    }
  }, [overview])

  const statusChartData = useMemo(() => {
    const byStatus = overview?.deliverables_by_status || {}
    return {
      labels: ['Todo', 'Editing', 'Delivered'],
      datasets: [{
        data: [byStatus.todo || 0, byStatus.doing || 0, byStatus.delivered || 0],
        backgroundColor: ['rgba(148, 163, 184, 0.6)', 'rgba(59, 130, 246, 0.7)', 'rgba(16, 185, 129, 0.8)'],
        borderColor: ['rgb(148, 163, 184)', 'rgb(59, 130, 246)', 'rgb(16, 185, 129)'],
        borderWidth: 2,
        hoverOffset: 6,
      }],
    }
  }, [overview])

  const clientBarData = useMemo(() => {
    const rankings = overview?.client_rankings || []
    const top5 = rankings.slice(0, 5)
    return {
      labels: top5.map((r) => r.client_name),
      datasets: [{
        label: 'Revenue',
        data: top5.map((r) => r.total),
        backgroundColor: 'rgba(139, 92, 246, 0.7)',
        borderColor: 'rgb(139, 92, 246)',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 28,
      }],
    }
  }, [overview])

  const deliverablesCount = overview?.client_rankings?.reduce((s, r) => s + (r.count_deliverables || 0), 0) ?? 0
  const clientsCount = overview?.client_rankings?.length ?? 0
  const monthComp = overview?.monthly_comparison || {}

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
  }

  const doughnutOptions = {
    ...chartOptions,
    cutout: '65%',
    plugins: {
      ...chartOptions.plugins,
      legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10, font: { size: 12 } } },
    },
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10, font: { size: 12 } } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 6, font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { font: { size: 11 } } },
    },
  }

  const barOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { font: { size: 11 } } },
      y: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  }

  const card = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900'

  return (
    <div className="space-y-6" data-tour="dashboard">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.client_id}
          onChange={(e) => setFilters((f) => ({ ...f, client_id: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="">All clients</option>
          {clients.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
        <input
          type="date"
          value={filters.period_start}
          onChange={(e) => setFilters((f) => ({ ...f, period_start: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <input
          type="date"
          value={filters.period_end}
          onChange={(e) => setFilters((f) => ({ ...f, period_end: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <button
          type="button"
          onClick={refresh}
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 shadow-sm"
        >
          Apply
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        </div>
      ) : overview ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-tour="dashboard-kpis">
            {/* Total Revenue */}
            <div className={card}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Revenue<InfoTip content="Sum of all deliverable values (paid + unpaid) in the selected date range." /></p>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-500/15">
                  <DollarSign className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
                ${overview.total_revenue?.toFixed(2) ?? '0.00'}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-sm">
                {monthComp.change_pct >= 0 ? (
                  <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                    <ArrowUp className="h-3.5 w-3.5" /> {monthComp.change_pct}%
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-rose-600 dark:text-rose-400">
                    <ArrowDown className="h-3.5 w-3.5" /> {Math.abs(monthComp.change_pct)}%
                  </span>
                )}
                <span className="text-slate-400">vs last month<InfoTip content="Percentage change comparing this month's revenue to the previous month." /></span>
              </div>
            </div>

            {/* Paid vs Unpaid */}
            <div className={card}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Paid / Unpaid<InfoTip content="Breakdown of paid vs unpaid deliverable revenue. The progress bar shows the paid ratio." /></p>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/15">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  ${overview.paid_total?.toFixed(2)}
                </span>
                <span className="text-lg text-slate-400">/</span>
                <span className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                  ${overview.unpaid_total?.toFixed(2)}
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-linear-to-r from-emerald-500 to-emerald-400"
                  style={{ width: `${overview.total_revenue > 0 ? (overview.paid_total / overview.total_revenue * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Active Clients */}
            <div className={card}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Clients<InfoTip content="Clients with at least one deliverable in the selected period." /></p>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-500/15">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{clientsCount}</p>
              <p className="mt-2 text-sm text-slate-400">
                {deliverablesCount} deliverable{deliverablesCount !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Collection Rate */}
            <div className={card}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Collection Rate<InfoTip content="Percentage of total revenue that has been marked as paid." /></p>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/15">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
                {overview.payment_collection_rate ?? 0}%
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Avg turnaround: {overview.avg_turnaround_days ?? 0} days
              </p>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-tour="dashboard-charts">
            <div className={card}>
              <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Revenue Trend<InfoTip content="Paid vs unpaid revenue over time, grouped by week." /></h3>
              {overview.trend?.length ? (
                <div className="h-56">
                  <Line data={trendData} options={lineOptions} />
                </div>
              ) : (
                <p className="py-12 text-center text-sm text-slate-400">No trend data in selected range.</p>
              )}
            </div>
            <div className={card}>
              <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Deliverables by Type<InfoTip content="Distribution of deliverables across shorts, thumbnails, and videos." /></h3>
              <div className="mx-auto h-56 w-56">
                <Doughnut data={typeChartData} options={doughnutOptions} />
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={card}>
              <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Client Revenue Ranking<InfoTip content="Top 5 clients ranked by total deliverable revenue." /></h3>
              {(overview.client_rankings?.length) ? (
                <div className="h-56">
                  <Bar data={clientBarData} options={barOptions} />
                </div>
              ) : (
                <p className="py-12 text-center text-sm text-slate-400">No client data available.</p>
              )}
            </div>
            <div className={card}>
              <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Workflow Status<InfoTip content="How many deliverables are marked complete vs still in progress." /></h3>
              <div className="mx-auto h-56 w-56">
                <Doughnut data={statusChartData} options={doughnutOptions} />
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className={`${card} p-0! overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
              <Link
                to="/deliverables"
                className="text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400"
              >
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(overview.recent_activity || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                        No deliverables yet.
                      </td>
                    </tr>
                  ) : (
                    (overview.recent_activity || []).map((d) => {
                      const typeColors = {
                        short: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
                        thumbnail: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
                        video: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
                      }
                      const paymentColors = {
                        paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
                        partial: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
                        unpaid: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
                      }
                      return (
                        <tr key={d.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-6 py-3.5">
                            <span className="font-medium text-slate-900 dark:text-white">{d.title || 'Untitled'}</span>
                          </td>
                          <td className="px-6 py-3.5 text-sm text-slate-500">{d.client_name || '—'}</td>
                          <td className="px-6 py-3.5">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${typeColors[d.type] || 'bg-slate-100 text-slate-600'}`}>
                              {d.type || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${paymentColors[d.payment_status] || paymentColors.unpaid}`}>
                              {d.payment_status || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right text-sm font-semibold text-slate-900 dark:text-white">
                            {d.price_value != null ? `$${Number(d.price_value).toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Insights Strip */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className={card}>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Top Client<InfoTip content="The client who has generated the most total revenue." /></p>
              <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                {overview.top_client_payer?.client_name || '—'}
              </p>
              {overview.top_client_payer && (
                <p className="mt-1 text-sm text-violet-600 dark:text-violet-400">${overview.top_client_payer.total?.toFixed(2)}</p>
              )}
            </div>
            <div className={card}>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Best Avg Rate<InfoTip content="The client with the highest average price per deliverable." /></p>
              <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                {overview.best_pay_per_deliverable_client
                  ? `$${overview.best_pay_per_deliverable_client.avg_per_deliverable?.toFixed(2)}`
                  : '—'}
              </p>
              {overview.best_pay_per_deliverable_client && (
                <p className="mt-1 text-sm text-slate-500">{overview.best_pay_per_deliverable_client.client_name}</p>
              )}
            </div>
            <div className={card}>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Avg Turnaround<InfoTip content="Average number of days between creating and completing a deliverable." /></p>
              <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                {overview.avg_turnaround_days ?? 0} days
              </p>
              <p className="mt-1 text-sm text-slate-500">Created → Completed</p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
