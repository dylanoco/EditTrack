import { useEffect, useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { fetchClients, fetchDashboardOverview } from '../api'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

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

  useEffect(() => {
    refresh()
  }, [])

  const trendData = useMemo(() => {
    const trend = overview?.trend || []
    return {
      labels: trend.map((t) => t.bucket),
      datasets: [
        { label: 'Paid', data: trend.map((t) => t.paid_total), backgroundColor: '#16a34a' },
        { label: 'Unpaid', data: trend.map((t) => t.unpaid_total), backgroundColor: '#f59e0b' },
      ],
    }
  }, [overview])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track paid, unpaid, and client performance.</p>
        </div>
      </div>
      {error ? <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div> : null}

      <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="grid gap-3 md:grid-cols-4">
          <select value={filters.client_id} onChange={(e) => setFilters((f) => ({ ...f, client_id: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700">
            <option value="">All clients</option>
            {clients.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
          <input type="date" value={filters.period_start} onChange={(e) => setFilters((f) => ({ ...f, period_start: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700" />
          <input type="date" value={filters.period_end} onChange={(e) => setFilters((f) => ({ ...f, period_end: e.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700" />
          <button type="button" onClick={refresh} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">Apply filters</button>
        </div>
      </section>

      {loading ? <p className="text-sm text-gray-500 dark:text-gray-400">Loading dashboard...</p> : null}
      {overview ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <Card title="Paid total" value={`$${overview.paid_total.toFixed(2)}`} />
            <Card title="Unpaid total" value={`$${overview.unpaid_total.toFixed(2)}`} />
            <Card title="Revenue" value={`$${overview.total_revenue.toFixed(2)}`} />
            <Card title="Unpaid deliverables" value={String(overview.unpaid_deliverables_count)} />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4 lg:col-span-2 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-3 text-lg font-medium text-gray-900 dark:text-white">Paid vs unpaid trend</h2>
              {overview.trend?.length ? <Bar data={trendData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} /> : <p className="text-sm text-gray-500 dark:text-gray-400">No trend data in selected range.</p>}
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="text-sm text-gray-500 dark:text-gray-400">Top client payer</h3>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">{overview.top_client_payer?.client_name || '—'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{overview.top_client_payer ? `$${overview.top_client_payer.total.toFixed(2)}` : ''}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="text-sm text-gray-500 dark:text-gray-400">Best pay per deliverable</h3>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">{overview.best_pay_per_deliverable_client?.client_name || '—'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{overview.best_pay_per_deliverable_client ? `$${overview.best_pay_per_deliverable_client.avg_per_deliverable.toFixed(2)}` : ''}</p>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}

function Card({ title, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}
