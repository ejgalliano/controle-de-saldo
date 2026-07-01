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

const PLATFORM_SLUG_MAP = {
  facebook_ads: 'facebook_ads',
  google_ads: 'google_adwords',
  linkedin_ads: 'linkedin_ads',
  tiktok_ads: 'tiktok_ads',
}

const SPEND_METRIC_KEY = {
  facebook_ads: 'fb_ads:spend',
  google_ads: 'google_adwords:cost',
  linkedin_ads: 'linkedin_ads:spend',
  tiktok_ads: 'tiktok_ads:spend',
}

export async function getIntegrations(projectId, platformKey) {
  const slug = PLATFORM_SLUG_MAP[platformKey] || platformKey
  let path = `integrations?per_page=100`
  if (projectId) path += `&project_id=${projectId}`
  if (slug) path += `&slug=${slug}`
  const data = await reporteiFetch(path)
  return data.data || []
}

export async function getMetrics(slug) {
  const data = await reporteiFetch(`metrics?integration_slug=${slug}&per_page=100`)
  return data.data || []
}

export async function getSpend(integrationId, platformKey, startDate, endDate) {
  const slug = PLATFORM_SLUG_MAP[platformKey] || platformKey
  const spendKey = SPEND_METRIC_KEY[platformKey]
  if (!spendKey) return 0

  const allMetrics = await getMetrics(slug)
  const spendMetric = allMetrics.find(m => m.reference_key === spendKey)
  if (!spendMetric) return 0

  const body = {
    start: startDate,
    end: endDate,
    integration_id: integrationId,
    metrics: [spendMetric]
  }

  const data = await reporteiFetch('metrics/get-data', 'POST', body)
  if (!data?.data) return 0

  // Pega o primeiro resultado independente do ID dinâmico
  const firstKey = Object.keys(data.data)[0]
  if (!firstKey) return 0
  const result = data.data[firstKey]
  if (!result || result.type === 'no_data_in_period') return 0
  return parseFloat(result.values) || 0
}

function fmtDate(d) {
  return d.toISOString().split('T')[0]
}

export function getPeriodRange(period, customStart, customEnd) {
  const now = new Date()
  const today = fmtDate(now)

  switch (period) {
    case 'mes_atual': {
      const start = fmtDate(new Date(now.getFullYear(), now.getMonth(), 1))
      return { start, end: today, diasDecorridos: now.getDate() }
    }
    case 'mes_anterior': {
      const start = fmtDate(new Date(now.getFullYear(), now.getMonth() - 1, 1))
      const end = fmtDate(new Date(now.getFullYear(), now.getMonth(), 0))
      const dias = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
      return { start, end, diasDecorridos: dias }
    }
    case 'ultimos_30': {
      const start = new Date(now)
      start.setDate(start.getDate() - 30)
      return { start: fmtDate(start), end: today, diasDecorridos: 30 }
    }
    case 'ultimos_15': {
      const start = new Date(now)
      start.setDate(start.getDate() - 15)
      return { start: fmtDate(start), end: today, diasDecorridos: 15 }
    }
    case 'ultimos_7': {
      const start = new Date(now)
      start.setDate(start.getDate() - 7)
      return { start: fmtDate(start), end: today, diasDecorridos: 7 }
    }
    case 'personalizado': {
      if (!customStart || !customEnd) return { start: today, end: today, diasDecorridos: 1 }
      const diff = Math.max(1, Math.round((new Date(customEnd) - new Date(customStart)) / (1000 * 60 * 60 * 24)) + 1)
      return { start: customStart, end: customEnd, diasDecorridos: diff }
    }
    default: {
      const start = fmtDate(new Date(now.getFullYear(), now.getMonth(), 1))
      return { start, end: today, diasDecorridos: now.getDate() }
    }
  }
}
