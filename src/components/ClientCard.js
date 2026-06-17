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

export default function ClientCard({ client, onAporte, onEdit, onDelete }) {
  const { project_name, platform, budget_mensal, spent, spentHoje, aportes, alerta_dias, loading } = client
  const totalAportes = (aportes || []).reduce((a, x) => a + x.valor, 0)
  const saldo = budget_mensal + totalAportes - (spent || 0)
  const diasDecorridos = new Date().getDate()
  const mediaDay = diasDecorridos > 0 ? (spent || 0) / diasDecorridos : 0
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

  const s = {
    card: { background: '#fff', border: `0.5px solid #e5e7eb`, borderLeft: `3px solid ${sc.border}`, borderRadius: 12, padding: '1rem 1.25rem', position: 'relative' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    name: { fontSize: 14, fontWeight: 500, color: '#111' },
    platBadge: { fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500, background: platColor.bg, color: platColor.color, marginTop: 3, display: 'inline-block' },
    statusBadge: { fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 500, background: sc.badge, color: sc.badgeText },
    diasBox: { textAlign: 'center', padding: '10px 8px', borderRadius: 8, background: sc.bg, margin: '10px 0' },
    diasNum: { fontSize: 28, fontWeight: 500, color: sc.text },
    diasLabel: { fontSize: 11, color: sc.text, marginTop: 2 },
    values: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, borderTop: '0.5px solid #e5e7eb', paddingTop: 10, marginTop: 8 },
    valLabel: { fontSize: 11, color: '#9ca3af' },
    valNum: { fontSize: 13, fontWeight: 500, color: '#111' },
    actions: { display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' },
    btn: { fontSize: 11, padding: '3px 10px', borderRadius: 99, border: '0.5px solid #d1d5db', background: 'transparent', cursor: 'pointer', color: '#374151' },
    btnGreen: { fontSize: 11, padding: '3px 10px', borderRadius: 99, border: '0.5px solid #86efac', background: '#f0fdf4', cursor: 'pointer', color: '#166534' },
  }

  return (
    <div style={s.card}>
      <div style={s.header}>
        <div>
          <div style={s.name}>{project_name}</div>
          <span style={s.platBadge}>{PLATFORM_LABELS[platform] || platform}</span>
        </div>
        <span style={s.statusBadge}>
          {status === 'alert' ? '⚠ alerta' : status === 'warning' ? '⏱ atenção' : '✓ ok'}
        </span>
      </div>

      {loading ? (
        <div style={{ ...s.diasBox, color: '#9ca3af', fontSize: 13 }}>Carregando spend...</div>
      ) : (
        <div style={s.diasBox}>
          <div style={s.diasNum}>{diasRestantes > 99 ? '99+' : diasRestantes}</div>
          <div style={s.diasLabel}>dias estimados de saldo</div>
        </div>
      )}

      <div style={s.values}>
        <div>
          <div style={s.valLabel}>saldo</div>
          <div style={{ ...s.valNum, color: sc.text }}>{fmt(saldo)}</div>
        </div>
        <div>
          <div style={s.valLabel}>média/dia</div>
          <div style={s.valNum}>{fmt(mediaDay)}</div>
        </div>
        <div>
          <div style={s.valLabel}>investido</div>
          <div style={s.valNum}>{fmt(spent || 0)}</div>
        </div>
      </div>

      {spentHoje > 0 && (
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>
          Gasto hoje: {fmt(spentHoje)}
        </div>
      )}

      {(aportes || []).map((a, i) => (
        <div key={i} style={{ fontSize: 11, color: '#16a34a', background: '#f0fdf4', padding: '2px 8px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, marginRight: 4 }}>
          + aporte {fmt(a.valor)} em {a.data}
        </div>
      ))}

      <div style={s.actions}>
        <button style={s.btnGreen} onClick={() => onAporte(client)}>+ aporte PIX</button>
        <button style={s.btn} onClick={() => onEdit(client)}>editar</button>
        <button style={{ ...s.btn, color: '#ef4444', borderColor: '#fca5a5' }} onClick={() => onDelete(client.id)}>remover</button>
      </div>
    </div>
  )
}
