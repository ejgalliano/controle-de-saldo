const REPORTEI_TOKEN = process.env.REACT_APP_REPORTEI_TOKEN
const BASE_URL = 'https://app.reportei.com/api/v2'

const headers = {
  'Authorization': `Bearer ${REPORTEI_TOKEN}`,
  'Content-Type': 'application/json'
}

export async function getProjects() {
  const res = await fetch(`${BASE_URL}/projects?per_page=100`, { headers })
  const data = await res.json()
  return data.data || []
}

export async function getIntegrations(projectId, slug) {
  const params = new URLSearchParams({ per_page: 100 })
  if (projectId) params.append('project_id', projectId)
  if (slug) params.append('slug', slug)
  const res = await fetch(`${BASE_URL}/integrations?${params}`, { headers })
  const data = await res.json()
  return data.data || []
}

export async function getMetrics(integrationSlug) {
  const res = await fetch(`${BASE_URL}/metrics?integration_slug=${integrationSlug}&per_page=100`, { headers })
  const data = await res.json()
  return data.data || []
}

export async function getSpend(integrationId, integrationSlug, startDate, endDate) {
  const spendKey = integrationSlug === 'facebook_ads' ? 'fb_ads:spend'
    : integrationSlug === 'google_ads' ? 'google_ads:cost'
    : integrationSlug === 'linkedin_ads' ? 'linkedin_ads:spend'
    : integrationSlug === 'tiktok_ads' ? 'tiktok_ads:spend'
    : null

  if (!spendKey) return 0

  const allMetrics = await getMetrics(integrationSlug)
  const spendMetric = allMetrics.find(m => m.reference_key === spendKey)
  if (!spendMetric) return 0

  const body = {
    start: startDate,
    end: endDate,
    integration_id: integrationId,
    metrics: [spendMetric]
  }

  const res = await fetch(`${BASE_URL}/metrics/get-data`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  const data = await res.json()
  const value = data?.data?.[spendMetric.id]?.values
  return value || 0
}

export function getMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const fmt = (d) => d.toISOString().split('T')[0]
  return { start: fmt(start), end: fmt(now) }
}

export function getTodayRange() {
  const today = new Date().toISOString().split('T')[0]
  return { start: today, end: today }
}

export function getDiasDecorridos() {
  const now = new Date()
  return now.getDate()
}
