const BASE_URL = '/api/reportei'

async function reporteiFetch(path, method = 'GET', body = null) {
  const encodedPath = encodeURIComponent(path)
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  }
  if (body) options.body = JSON.stringify(body)
  const res = await fetch(`${BASE_URL}?path=${encodedPath}`, options)
  return res.json()
}

export async function getProjects() {
  const data = await reporteiFetch('projects?per_page=100')
  return data.data || []
}

export async function getIntegrations(projectId, slug) {
  let path = 'integrations?per_page=100'
  if (projectId) path += `&project_id=${projectId}`
  if (slug) path += `&slug=${slug}`
  const data = await reporteiFetch(path)
  return data.data || []
}

export async function getMetrics(integrationSlug) {
  const data = await reporteiFetch(`metrics?integration_slug=${integrationSlug}&per_page=100`)
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

  const data = await reporteiFetch('metrics/get-data', 'POST', body)
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
  return new Date().getDate()
}
