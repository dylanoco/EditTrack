const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, '') || 'http://localhost:8000'

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    const msg =
      (data && (data.detail || data.message)) ||
      `Request failed: ${res.status} ${res.statusText}`
    throw new Error(msg)
  }

  return data
}

export async function fetchClients() {
  return request('/clients')
}

export async function createClient(payload) {
  return request('/clients', { method: 'POST', body: payload })
}

export async function fetchDeliverables(params = {}) {
  const qs = new URLSearchParams()
  if (params.client_id) qs.set('client_id', String(params.client_id))
  if (params.status) qs.set('status', params.status)
  if (params.deliverable_type) qs.set('deliverable_type', params.deliverable_type)

  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return request(`/deliverables${suffix}`)
}

export async function createDeliverable(payload) {
  return request('/deliverables', { method: 'POST', body: payload })
}

export async function fetchBillingTotals(params = {}) {
  const qs = new URLSearchParams()
  if (params.client_id) qs.set('client_id', String(params.client_id))
  if (params.period_start) qs.set('period_start', params.period_start)
  if (params.period_end) qs.set('period_end', params.period_end)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return request(`/billing/totals${suffix}`)
}

export async function fetchInvoices(params = {}) {
  const qs = new URLSearchParams()
  if (params.client_id) qs.set('client_id', String(params.client_id))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return request(`/invoices${suffix}`)
}

export async function createInvoice(payload) {
  return request('/invoices', { method: 'POST', body: payload })
}

