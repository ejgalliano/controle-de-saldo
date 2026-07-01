const BASE_URL = '/api/reportei'

async function reporteiFetch(path, method = 'GET', body = null) {
  const encodedPath = encodeURIComponent(path)
  const options = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) options.body = JSON.stringify(body)
  const res = await fetch(`${BASE_URL}?path=${encodedPath}`, options)
  return res.json()
}

export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

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

const METRICS_MAP = {
  facebook_ads: {
    spend: 'fb_ads:spend',
    leads: 'fb_ads:actions_lead',
    cpl: 'fb_ads:actions_cost_per_lead',
    ctr: 'fb_ads:ctr',
    cpc: 'fb_ads:cpc',
    cpm: 'fb_ads:cpm',
    frequency: 'fb_ads:frequency',
    reach: 'fb_ads:reach',
    campaigns: 'fb_ads:count_campaigns',
  },
  google_ads: {
    spend: 'gads:cost_micros',
    conversions: 'gads:conversions',
    cpl: 'gads:cost_per_conversion',
    ctr: 'gads:ctr',
    cpc: 'gads:average_cpc',
    cpm: 'gads:average_cpm',
    campaigns: 'gads:count_campaigns',
  },
}

export async function getIntegrations(projectId, platformKey) {
  const slug = PLATFORM_SLUG_MAP[platformKey] || platformKey
  let path = `integrations?per_page=100`
  if (projectId) path += `&project_id=${projectId}`
  if (slug) path += `&slug=${slug}`
  const data = await reporteiFetch(path)
  return data.data || []
}

async function getMetrics(slug) {
  const data = await reporteiFetch(`metrics?integration_slug=${slug}&per_page=100`)
  return data.data || []
}

const metricsCache = {}

export function clearMetricsCache() {
  Object.keys(metricsCache).forEach(key => delete metricsCache[key])
}

export async function getMetricsData(integrationId, platformKey, startDate, endDate) {
  const slug = PLATFORM_SLUG_MAP[platformKey] || platformKey
  const metricsKeys = METRICS_MAP[platformKey]
  if (!metricsKeys) return {}

  if (!metricsCache[slug]) {
    metricsCache[slug] = await getMetrics(slug)
    await delay(300)
  }

  const allMetrics = metricsCache[slug]

  // Busca todas as métricas relevantes de uma vez
  const metricsToFetch = Object.entries(metricsKeys)
    .map(([key, refKey]) => ({ key, metric: allMetrics.find(m => m.reference_key === refKey) }))
    .filter(({ metric }) => metric)

  if (!metricsToFetch.length) return {}

  const body = {
    start: startDate,
    end: endDate,
    integration_id: integrationId,
    metrics: metricsToFetch.map(({ metric }) => metric)
  }

  const data = await reporteiFetch('metrics/get-data', 'POST', body)
  if (!data?.data) return {}

  // Mapeia resultado por chave amigável
  const result = {}
  metricsToFetch.forEach(({ key, metric }) => {
    const metricData = data.data[metric.id]
    if (metricData && metricData.type !== 'no_data_in_period') {
      result[key] = parseFloat(metricData.values) || 0
    } else {
      result[key] = 0
    }
  })

  return result
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
