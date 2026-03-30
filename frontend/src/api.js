const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, '') || 'http://localhost:8000'

function getAccessToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('edittrack_token')
}

export function clearAuth() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('edittrack_token')
    localStorage.removeItem('edittrack_user')
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const token = getAccessToken()
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (res.status === 401) {
    clearAuth()
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const msg =
      (data && (data.detail || data.message)) ||
      `Request failed: ${res.status} ${res.statusText}`
    throw new Error(msg)
  }

  return data
}

export async function register(payload) {
  return request('/auth/register', { method: 'POST', body: payload })
}

export async function login(payload) {
  return request('/auth/login', { method: 'POST', body: payload })
}

export async function fetchMe() {
  return request('/auth/me')
}

export async function updateProfile(payload) {
  return request('/auth/me', { method: 'PATCH', body: payload })
}

export async function fetchDashboardOverview(params = {}) {
  const qs = new URLSearchParams()
  if (params.client_id) qs.set('client_id', String(params.client_id))
  if (params.period_start) qs.set('period_start', params.period_start)
  if (params.period_end) qs.set('period_end', params.period_end)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return request(`/dashboard/overview${suffix}`)
}

export async function fetchClients(params = {}) {
  const qs = new URLSearchParams()
  if (params.archived !== undefined) qs.set('archived', String(params.archived))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return request(`/clients${suffix}`)
}

export async function fetchClient(id) {
  return request(`/clients/${id}`)
}

export async function createClient(payload) {
  return request('/clients', { method: 'POST', body: payload })
}

export async function updateClient(id, payload) {
  return request(`/clients/${id}`, { method: 'PATCH', body: payload })
}

export async function fetchDeliverables(params = {}) {
  const qs = new URLSearchParams()
  if (params.client_id) qs.set('client_id', String(params.client_id))
  if (params.status) qs.set('status', params.status)
  if (params.deliverable_type) qs.set('deliverable_type', params.deliverable_type)
  if (params.payment_status) qs.set('payment_status', params.payment_status)
  if (typeof params.invoiced === 'boolean') qs.set('invoiced', String(params.invoiced))
  if (params.sort) qs.set('sort', params.sort)
  if (params.order) qs.set('order', params.order)
  if (params.archived !== undefined) qs.set('archived', String(params.archived))

  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return request(`/deliverables${suffix}`)
}

export async function createDeliverable(payload) {
  return request('/deliverables', { method: 'POST', body: payload })
}

export async function updateDeliverable(id, payload) {
  return request(`/deliverables/${id}`, { method: 'PATCH', body: payload })
}

export async function fetchBillingTotals(params = {}) {
  const qs = new URLSearchParams()
  if (params.client_id) qs.set('client_id', String(params.client_id))
  if (params.period_start) qs.set('period_start', params.period_start)
  if (params.period_end) qs.set('period_end', params.period_end)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return request(`/billing/totals${suffix}`)
}

export async function fetchBillingDeliverables(params) {
  const qs = new URLSearchParams({
    client_id: String(params.client_id),
    period_start: params.period_start,
    period_end: params.period_end,
  })
  return request(`/billing/deliverables?${qs}`)
}

/** One row per invoiced deliverable (line item), for CSV export */
export async function fetchInvoiceLineItems(params = {}) {
  const qs = new URLSearchParams()
  if (params.client_id) qs.set('client_id', String(params.client_id))
  if (params.period_start) qs.set('period_start', params.period_start)
  if (params.period_end) qs.set('period_end', params.period_end)
  if (params.include_archived_clients) qs.set('include_archived_clients', 'true')
  const suffix = qs.toString() ? `?${qs}` : ''
  return request(`/billing/invoice-line-items${suffix}`)
}

export async function fetchInvoices(params = {}) {
  const qs = new URLSearchParams()
  if (params.client_id) qs.set('client_id', String(params.client_id))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return request(`/invoices${suffix}`)
}

export async function fetchInvoice(id) {
  return request(`/invoices/${id}`)
}

export async function createInvoice(payload) {
  return request('/invoices', { method: 'POST', body: payload })
}

export async function fetchClientSources(clientId) {
  return request(`/clients/${clientId}/sources`)
}

export async function syncClientSources(clientId, platform = 'twitch', force = false, sourceType = 'clips') {
  const qs = new URLSearchParams({ platform, force: String(force), source_type: sourceType })
  return request(`/clients/${clientId}/sources/sync?${qs}`, { method: 'POST' })
}

export async function invoiceSingleDeliverable(deliverableId) {
  return request(`/deliverables/${deliverableId}/invoice`, { method: 'POST' })
}

export async function fetchSetupStatus() {
  return request('/me/setup')
}

