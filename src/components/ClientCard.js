const PLATFORM_LABELS = {
  facebook_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  linkedin_ads: 'LinkedIn Ads',
  tiktok_ads: 'TikTok Ads',
}

const PLATFORM_COLORS = {
  facebook_ads: { bg: '#e8f0fe', color: '#1a56db' },
  google_ads: { bg: '#fef3c7', color: '#92400e' },
  linkedin_ads: { bg: '#dbeafe', color: '#1e40af' },
  tiktok_ads: { bg: '#fce7f3', color: '#9d174d' },
}

function fmt(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtNum(v) {
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function MetricRow({ label, value, status, suffix = '' }) {
  const color = status === 'red' ? '#dc2626' : status === 'yellow' ? '#d97706' : '#16a34a'
  const icon = status === 'red' ? '🔴' : status === 'yellow' ? '🟡' : '🟢'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '0.5px solid #f3f4f6' }}>
      <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color }}>
        {icon} {value}{suffix}
      </span>
    </div>
  )
}

function getMetricStatus(key, value) {
  const thresholds = {
    ctr_meta: { red: 0.8, yellow: 1.5 },
    ctr_google: { red: 2, yellow: 4 },
    frequency: { red: 3.5, yellow: 2.5 },
    cpl: { red: null, yellow: null }, // sem threshold fixo
    campaigns: { red: 0, yellow: null },
    leads: { red: 0, yellow: null },
    conversions: { red: 0, yellow: null },
  }

  if (key === 'campaigns' || key === 'leads' || key === 'conversions') {
    return value === 0 ? 'red' : 'green'
  }
  if (key === 'ctr_meta') {
    if (value < thresholds.ctr_meta.red) return 'red'
    if (value < thresholds.ctr_meta.yellow) return 'yellow'
    return 'green'
  }
  if (key === 'ctr_google') {
    if (value < thresholds.ctr_google.red) return 'red'
    if (value < thresholds.ctr_google.yellow) return 'yellow'
    return 'green'
  }
  if (key === 'frequency') {
    if (value >= thresholds.frequency.red) return 'red'
    if (value >= thresholds.frequency.yellow) return 'yellow'
    return 'green'
  }
  return 'green'
}

export default function ClientCard({ client, onAporte, onEdit, onDelete }) {
  const { project_name, platform, budget_mensal, spent, aportes, alerta_dias, loading, diasDecorridos, metrics } = client
  const totalAportes = (aportes || []).reduce((a, x) => a + x.valor, 0)
  const saldo = budget_mensal + totalAportes - (spent || 0)
  const dias = diasDecorridos || 1
  const mediaDay = dias > 0 ? (spent || 0) / dias : 0
  const diasRestantes = mediaDay > 0 ? Math.floor(saldo / mediaDay) : 99

  const status = diasRestantes <= alerta_dias ? 'alert'
    : diasRestantes <= alerta_dias + 5 ? 'warning'
    : 'ok'

  const statusColors = {
    alert: { border: '#ef4444', bg: '#fef2f2', text: '#b91c1c', badge: '#fee2e2', badgeText: '#991b1b' },
    warning: { border: '#f59e0b', bg: '#fffbeb', text: '#92400e', badge: '#fef3c7', badgeText: '#78350f' },
    ok: { border: '#22c55e', bg: '#f0fdf4', text: '#15803d', badge: '#dcfce7', badgeText: '#166534' },
  }
  const sc = statusColors[status]
  const platColor = PLATFORM_COLORS[platform] || { bg: '#f3f4f6', color: '#374151' }
  const isMeta = platform === 'facebook_ads'

  return (
    <div style={{ background: '#fff', border: `0.5px solid #e5e7eb`, borderLeft: `3px solid ${sc.border}`, borderRadius: 12, padding: '1rem 1.25rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{project_name}</div>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500, background: platColor.bg, color: platColor.color, marginTop: 3, display: 'inline-block' }}>
            {PLATFORM_LABELS[platform] || platform}
          </span>
        </div>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500, background: sc.badge, color: sc.badgeText }}>
          {status === 'alert' ? '⚠ alerta' : status === 'warning' ? '⏱ atenção' : '✓ ok'}
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: '#9ca3af' }}>Carregando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* Coluna esquerda — Financeiro */}
          <div>
            <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Financeiro</div>

            <div style={{ textAlign: 'center', padding: '8px', borderRadius: 8, background: sc.bg, marginBottom: 10 }}>
              <div style={{ fontSize: 24, fontWeight: 500, color: sc.text }}>{diasRestantes > 99 ? '99+' : diasRestantes}</div>
              <div style={{ fontSize: 11, color: sc.text }}>dias estimados</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div style={{ background: '#f9fafb', borderRadius: 6, padding: '6px 8px' }}>
                <div style={{ fontSize: 10, color: '#9ca3af' }}>saldo</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: sc.text }}>{fmt(saldo)}</div>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 6, padding: '6px 8px' }}>
                <div style={{ fontSize: 10, color: '#9ca3af' }}>investido</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#111' }}>{fmt(spent || 0)}</div>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 6, padding: '6px 8px' }}>
                <div style={{ fontSize: 10, color: '#9ca3af' }}>média/dia</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#111' }}>{fmt(mediaDay)}</div>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 6, padding: '6px 8px' }}>
                <div style={{ fontSize: 10, color: '#9ca3af' }}>budget</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#111' }}>{fmt(budget_mensal + totalAportes)}</div>
              </div>
            </div>

            {(aportes || []).map((a, i) => (
              <div key={i} style={{ fontSize: 11, color: '#16a34a', background: '#f0fdf4', padding: '2px 8px', borderRadius: 99, display: 'inline-flex', gap: 4, marginTop: 6, marginRight: 4 }}>
                + {fmt(a.valor)} em {a.data}
              </div>
            ))}
          </div>

          {/* Coluna direita — Saúde */}
          <div>
            <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Saúde da campanha</div>

            {!metrics ? (
              <div style={{ fontSize: 12, color: '#9ca3af', padding: '8px 0' }}>—</div>
            ) : (
              <>
                <MetricRow label="Campanhas ativas" value={fmtNum(metrics.campaigns || 0)} status={getMetricStatus('campaigns', metrics.campaigns || 0)} />

                {isMeta ? (
                  <>
                    <MetricRow label="Leads" value={fmtNum(metrics.leads || 0)} status={getMetricStatus('leads', metrics.leads || 0)} />
                    <MetricRow label="Custo/lead" value={fmt(metrics.cpl || 0)} status="green" />
                    <MetricRow label="CTR" value={fmtNum(metrics.ctr || 0)} suffix="%" status={getMetricStatus('ctr_meta', metrics.ctr || 0)} />
                    <MetricRow label="CPC" value={fmt(metrics.cpc || 0)} status="green" />
                    <MetricRow label="CPM" value={fmt(metrics.cpm || 0)} status="green" />
                    <MetricRow label="Frequência" value={fmtNum(metrics.frequency || 0)} status={getMetricStatus('frequency', metrics.frequency || 0)} />
                    <MetricRow label="Alcance" value={fmtNum(metrics.reach || 0)} status="green" />
                  </>
                ) : (
                  <>
                    <MetricRow label="Conversões" value={fmtNum(metrics.conversions || 0)} status={getMetricStatus('conversions', metrics.conversions || 0)} />
                    <MetricRow label="Custo/conv." value={fmt(metrics.cpl || 0)} status="green" />
                    <MetricRow label="CTR" value={fmtNum(metrics.ctr || 0)} suffix="%" status={getMetricStatus('ctr_google', metrics.ctr || 0)} />
                    <MetricRow label="CPC médio" value={fmt(metrics.cpc || 0)} status="green" />
                    <MetricRow label="CPM" value={fmt(metrics.cpm || 0)} status="green" />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Ações */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap', borderTop: '0.5px solid #f3f4f6', paddingTop: 10 }}>
        <button style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, border: '0.5px solid #86efac', background: '#f0fdf4', cursor: 'pointer', color: '#166534' }} onClick={() => onAporte(client)}>+ aporte PIX</button>
        <button style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, border: '0.5px solid #d1d5db', background: 'transparent', cursor: 'pointer', color: '#374151' }} onClick={() => onEdit(client)}>editar</button>
        <button style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, border: '0.5px solid #fca5a5', background: 'transparent', cursor: 'pointer', color: '#ef4444' }} onClick={() => onDelete(client.id)}>remover</button>
      </div>
    </div>
  )
}
