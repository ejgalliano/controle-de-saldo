import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'
import { getIntegrations, getSpendCached, getPeriodRange, delay } from './reporteiService'
import ClientCard from './components/ClientCard'
import ClientModal from './components/ClientModal'
import AporteModal from './components/AporteModal'

const PLATFORM_LABELS = {
  facebook_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  linkedin_ads: 'LinkedIn Ads',
  tiktok_ads: 'TikTok Ads',
}

const ALL_PLATFORMS = ['facebook_ads', 'google_ads', 'linkedin_ads', 'tiktok_ads']

const PERIOD_OPTIONS = [
  { value: 'mes_atual', label: 'Mês atual' },
  { value: 'mes_anterior', label: 'Mês anterior' },
  { value: 'ultimos_30', label: 'Últimos 30 dias' },
  { value: 'ultimos_15', label: 'Últimos 15 dias' },
  { value: 'ultimos_7', label: 'Últimos 7 dias' },
  { value: 'personalizado', label: 'Personalizado' },
]

function fmt(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function ClientSearch({ clientNames, clientFilter, setClientFilter }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = clientNames.filter(n => n.toLowerCase().includes(search.toLowerCase()))
  const displayValue = clientFilter === 'all' ? '' : clientFilter

  return (
    <div ref={ref} style={{ position: 'relative', width: 280 }}>
      <input
        type="text"
        placeholder={clientFilter === 'all' ? 'Todos os clientes...' : clientFilter}
        value={open ? search : displayValue}
        onChange={e => { setSearch(e.target.value); setOpen(true) }}
        onFocus={() => { setSearch(''); setOpen(true) }}
        style={{ width: '100%', fontSize: 13, padding: '6px 12px', borderRadius: 8, border: '0.5px solid #d1d5db', background: '#fff', color: '#111', outline: 'none' }}
      />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: 240, overflowY: 'auto' }}>
          <div style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', color: '#6b7280', borderBottom: '0.5px solid #f3f4f6' }} onMouseDown={() => { setClientFilter('all'); setSearch(''); setOpen(false) }}>
            Todos os clientes
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: 13, color: '#9ca3af' }}>Nenhum resultado</div>
          ) : filtered.map(name => (
            <div key={name} style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', background: clientFilter === name ? '#f3f4f6' : 'transparent', color: '#111', borderBottom: '0.5px solid #f9fafb' }} onMouseDown={() => { setClientFilter(name); setSearch(''); setOpen(false) }}>
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [clients, setClients] = useState([])
  const [platformFilter, setPlatformFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [period, setPeriod] = useState('mes_atual')
  const [activePeriod, setActivePeriod] = useState('mes_atual')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [activeCustomStart, setActiveCustomStart] = useState('')
  const [activeCustomEnd, setActiveCustomEnd] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editClient, setEditClient] = useState(null)
  const [aporteClient, setAporteClient] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [diasDecorridos, setDiasDecorridos] = useState(1)

  const loadClients = useCallback(async () => {
    const { data, error } = await supabase.from('clients_budget').select('*').order('project_name')
    if (error) { console.error(error); return }
    setClients(data.map(c => ({ ...c, spent: null, loading: true })))
    return data
  }, [])

  const fetchSpends = useCallback(async (data, periodKey, cStart, cEnd) => {
    if (!data || data.length === 0) return
    const { start, end, diasDecorridos: dias } = getPeriodRange(periodKey, cStart, cEnd)
    setDiasDecorridos(dias)

    const BATCH_SIZE = 3

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(batch.map(async (client) => {
        try {
          const integrations = await getIntegrations(client.project_id, client.platform)
          if (!integrations.length) return { ...client, spent: 0, loading: false }
          const integration = integrations[0]
          const spent = await getSpendCached(integration.id, client.platform, start, end)
          return { ...client, spent, loading: false }
        } catch (e) {
          console.error('Erro:', e)
          return { ...client, spent: 0, loading: false }
        }
      }))

      setClients(prev => {
        const updated = [...prev]
        batchResults.forEach(r => {
          const idx = updated.findIndex(c => c.id === r.id)
          if (idx !== -1) updated[idx] = r
        })
        return updated
      })

      if (i + BATCH_SIZE < data.length) await delay(500)
    }

    setLastUpdated(new Date())
  }, [])

  useEffect(() => {
    loadClients().then(data => fetchSpends(data, 'mes_atual', '', ''))
  }, [loadClients, fetchSpends])

  async function handleBuscar() {
    if (period === 'personalizado' && (!customStart || !customEnd)) {
      alert('Informe as datas de início e fim.')
      return
    }
    setRefreshing(true)
    setActivePeriod(period)
    setActiveCustomStart(customStart)
    setActiveCustomEnd(customEnd)
    const data = await loadClients()
    await fetchSpends(data, period, customStart, customEnd)
    setRefreshing(false)
  }

  async function handleRefresh() {
    setRefreshing(true)
    const data = await loadClients()
    await fetchSpends(data, activePeriod, activeCustomStart, activeCustomEnd)
    setRefreshing(false)
  }

  async function handleSaveClient(formData) {
    // Verifica duplicidade
    const exists = clients.find(c => c.project_id === formData.project_id && c.platform === formData.platform)
    if (exists && !editClient) {
      alert(`Já existe um card para ${formData.project_name} na plataforma ${PLATFORM_LABELS[formData.platform] || formData.platform}.`)
      return
    }
    if (editClient) {
      const { error } = await supabase.from('clients_budget').update({ ...formData, updated_at: new Date() }).eq('id', editClient.id)
      if (error) { alert('Erro ao salvar.'); return }
    } else {
      const { error } = await supabase.from('clients_budget').insert([formData])
      if (error) { alert('Erro ao salvar.'); return }
    }
    setShowAddModal(false)
    setEditClient(null)
    const data = await loadClients()
    fetchSpends(data, activePeriod, activeCustomStart, activeCustomEnd)
  }

  async function handleSaveAporte(updatedClient) {
    const { error } = await supabase.from('clients_budget')
      .update({ aportes: updatedClient.aportes, updated_at: new Date() })
      .eq('id', updatedClient.id)
    if (error) { alert('Erro ao registrar aporte.'); return }
    setAporteClient(null)
    const data = await loadClients()
    fetchSpends(data, activePeriod, activeCustomStart, activeCustomEnd)
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover este cliente do monitor?')) return
    await supabase.from('clients_budget').delete().eq('id', id)
    const data = await loadClients()
    fetchSpends(data, activePeriod, activeCustomStart, activeCustomEnd)
  }

  const activePlatforms = [...new Set(clients.map(c => c.platform))].filter(p => ALL_PLATFORMS.includes(p))
  const clientNames = [...new Set(clients.map(c => c.project_name))].sort()

  const filteredClients = clients
    .filter(c => platformFilter === 'all' || c.platform === platformFilter)
    .filter(c => clientFilter === 'all' || c.project_name === clientFilter)

  const totalBudget = filteredClients.reduce((a, c) => a + c.budget_mensal + (c.aportes || []).reduce((x, y) => x + y.valor, 0), 0)
  const totalSpent = filteredClients.reduce((a, c) => a + (c.spent || 0), 0)
  const totalSaldo = totalBudget - totalSpent

  const alertCount = filteredClients.filter(c => {
    const saldo = c.budget_mensal + (c.aportes || []).reduce((x, y) => x + y.valor, 0) - (c.spent || 0)
    const media = diasDecorridos > 0 ? (c.spent || 0) / diasDecorridos : 0
    const dias = media > 0 ? Math.floor(saldo / media) : 99
    return dias <= c.alerta_dias
  }).length

  const activePlatformsFiltered = [...new Set(filteredClients.map(c => c.platform))]
  const platformGroups = platformFilter === 'all'
    ? activePlatformsFiltered.map(p => ({ platform: p, items: filteredClients.filter(c => c.platform === p) }))
    : [{ platform: platformFilter, items: filteredClients }]

  const summaryLabel = clientFilter !== 'all' ? clientFilter : platformFilter !== 'all' ? PLATFORM_LABELS[platformFilter] : 'Todos os clientes'
  const activePeriodLabel = PERIOD_OPTIONS.find(o => o.value === activePeriod)?.label || ''

  const s = {
    app: { maxWidth: 900, margin: '0 auto', padding: '0 1rem 3rem', fontFamily: 'system-ui, sans-serif' },
    filterRow: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 },
    filterLabel: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 60 },
    metricCard: { background: '#f9fafb', borderRadius: 8, padding: '1rem' },
    metricLabel: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
    metricValue: { fontSize: 20, fontWeight: 500, color: '#111' },
    sectionTitle: { fontSize: 12, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '1.25rem 0 0.75rem', display: 'flex', alignItems: 'center', gap: 6 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 },
    emptyState: { textAlign: 'center', padding: '3rem 0', color: '#9ca3af', fontSize: 14 },
  }

  const filterBtnStyle = (active) => ({
    fontSize: 13, padding: '5px 12px', borderRadius: 99, cursor: 'pointer',
    border: active ? '0.5px solid #374151' : '0.5px solid #e5e7eb',
    background: active ? '#f3f4f6' : 'transparent',
    fontWeight: active ? 500 : 400,
    color: active ? '#111' : '#6b7280',
  })

  return (
    <div style={s.app}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 0 1rem', borderBottom: '0.5px solid #e5e7eb', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500, color: '#111' }}>Monitor de budget — GZ Marketing</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>
            {lastUpdated ? `${activePeriodLabel} · atualizado às ${lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Carregando...'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleRefresh} disabled={refreshing} style={{ fontSize: 13 }}>
            {refreshing ? 'Atualizando...' : '↻ Atualizar'}
          </button>
          <button onClick={() => setShowAddModal(true)} style={{ fontSize: 13 }}>+ Cliente</button>
        </div>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <div style={s.filterRow}>
          <span style={s.filterLabel}>Período</span>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={{ fontSize: 13, padding: '5px 10px', borderRadius: 8, border: '0.5px solid #d1d5db', background: '#fff', color: '#111' }}>
            {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {period === 'personalizado' && (
            <>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ fontSize: 13, padding: '5px 10px', borderRadius: 8, border: '0.5px solid #d1d5db' }} />
              <span style={{ fontSize: 13, color: '#9ca3af' }}>até</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ fontSize: 13, padding: '5px 10px', borderRadius: 8, border: '0.5px solid #d1d5db' }} />
            </>
          )}
          <button onClick={handleBuscar} disabled={refreshing} style={{ fontSize: 13, padding: '5px 16px', borderRadius: 8, background: '#111', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            {refreshing ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
        <div style={s.filterRow}>
          <span style={s.filterLabel}>Cliente</span>
          <ClientSearch clientNames={clientNames} clientFilter={clientFilter} setClientFilter={setClientFilter} />
        </div>
        <div style={s.filterRow}>
          <span style={s.filterLabel}>Plataforma</span>
          <button style={filterBtnStyle(platformFilter === 'all')} onClick={() => setPlatformFilter('all')}>Todas</button>
          {activePlatforms.map(p => (
            <button key={p} style={filterBtnStyle(platformFilter === p)} onClick={() => setPlatformFilter(p)}>
              {PLATFORM_LABELS[p] || p}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
        Exibindo: <strong style={{ color: '#374151' }}>{summaryLabel}</strong> · {filteredClients.length} card{filteredClients.length !== 1 ? 's' : ''} · {diasDecorridos} dias no período
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <div style={s.metricCard}><div style={s.metricLabel}>budget total</div><div style={s.metricValue}>{fmt(totalBudget)}</div></div>
        <div style={s.metricCard}><div style={s.metricLabel}>investido no período</div><div style={{ ...s.metricValue, color: '#d97706' }}>{fmt(totalSpent)}</div></div>
        <div style={s.metricCard}><div style={s.metricLabel}>saldo disponível</div><div style={{ ...s.metricValue, color: '#16a34a' }}>{fmt(totalSaldo)}</div></div>
        <div style={s.metricCard}><div style={s.metricLabel}>em alerta</div><div style={{ ...s.metricValue, color: alertCount > 0 ? '#dc2626' : '#16a34a' }}>{alertCount} de {filteredClients.length}</div></div>
      </div>

      {clients.length === 0 ? (
        <div style={s.emptyState}>
          <p>Nenhum cliente cadastrado ainda.</p>
          <button onClick={() => setShowAddModal(true)} style={{ marginTop: 12, fontSize: 13 }}>+ Adicionar primeiro cliente</button>
        </div>
      ) : filteredClients.length === 0 ? (
        <div style={s.emptyState}><p>Nenhum card encontrado para o filtro selecionado.</p></div>
      ) : (
        platformGroups.map(group => (
          <div key={group.platform}>
            {platformFilter === 'all' && (
              <div style={s.sectionTitle}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: group.platform === 'facebook_ads' ? '#1a56db' : group.platform === 'google_ads' ? '#d97706' : '#9d174d', display: 'inline-block' }} />
                {PLATFORM_LABELS[group.platform] || group.platform}
                <span style={{ fontWeight: 400, color: '#d1d5db' }}>· {group.items.length} cliente{group.items.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            <div style={s.grid}>
              {group.items.map(c => (
                <ClientCard
                  key={c.id}
                  client={{ ...c, platform_label: PLATFORM_LABELS[c.platform], diasDecorridos }}
                  onAporte={setAporteClient}
                  onEdit={c => setEditClient(c)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        ))
      )}

      <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: 8, fontSize: 13, color: '#6b7280' }}>
        ℹ Dias estimados = saldo disponível ÷ média de gasto diário (spend do período ÷ dias no período)
      </div>

      {(showAddModal || editClient) && (
        <ClientModal editData={editClient} onClose={() => { setShowAddModal(false); setEditClient(null) }} onSave={handleSaveClient} />
      )}
      {aporteClient && (
        <AporteModal client={aporteClient} onClose={() => setAporteClient(null)} onSave={handleSaveAporte} />
      )}
    </div>
  )
}
