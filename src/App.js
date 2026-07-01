import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { getIntegrations, getSpend, getMonthRange, getTodayRange, getDiasDecorridos } from './reporteiService'
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

function fmt(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function App() {
  const [clients, setClients] = useState([])
  const [platformFilter, setPlatformFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editClient, setEditClient] = useState(null)
  const [aporteClient, setAporteClient] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadClients = useCallback(async () => {
    const { data, error } = await supabase.from('clients_budget').select('*').order('project_name')
    if (error) { console.error(error); return }
    setClients(data.map(c => ({ ...c, spent: null, spentHoje: null, loading: true })))
    return data
  }, [])

  const fetchSpends = useCallback(async (data) => {
    if (!data || data.length === 0) return
    const { start, end } = getMonthRange()
    const today = getTodayRange()

    const updated = await Promise.all(data.map(async (client) => {
      try {
        const integrations = await getIntegrations(client.project_id, client.platform)
        if (!integrations.length) return { ...client, spent: 0, spentHoje: 0, loading: false }
        const integration = integrations[0]
        const [spent, spentHoje] = await Promise.all([
          getSpend(integration.id, client.platform, start, end),
          getSpend(integration.id, client.platform, today.start, today.end)
        ])
        return { ...client, spent, spentHoje, loading: false }
      } catch (e) {
        console.error('Erro ao buscar spend:', e)
        return { ...client, spent: 0, spentHoje: 0, loading: false }
      }
    }))

    setClients(updated)
    setLastUpdated(new Date())
  }, [])

  useEffect(() => {
    loadClients().then(data => fetchSpends(data))
  }, [loadClients, fetchSpends])

  async function handleRefresh() {
    setRefreshing(true)
    const data = await loadClients()
    await fetchSpends(data)
    setRefreshing(false)
  }

  async function handleSaveClient(formData) {
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
    fetchSpends(data)
  }

  async function handleSaveAporte(updatedClient) {
    const { error } = await supabase.from('clients_budget')
      .update({ aportes: updatedClient.aportes, updated_at: new Date() })
      .eq('id', updatedClient.id)
    if (error) { alert('Erro ao registrar aporte.'); return }
    setAporteClient(null)
    const data = await loadClients()
    fetchSpends(data)
  }

  async function handleDelete(id) {
    if (!window.confirm('Remover este cliente do monitor?')) return
    await supabase.from('clients_budget').delete().eq('id', id)
    const data = await loadClients()
    fetchSpends(data)
  }

  const activePlatforms = [...new Set(clients.map(c => c.platform))].filter(p => ALL_PLATFORMS.includes(p))
  const clientNames = [...new Set(clients.map(c => c.project_name))].sort()

  const filteredClients = clients
    .filter(c => platformFilter === 'all' || c.platform === platformFilter)
    .filter(c => clientFilter === 'all' || c.project_name === clientFilter)

  const totalBudget = filteredClients.reduce((a, c) => a + c.budget_mensal + (c.aportes || []).reduce((x, y) => x + y.valor, 0), 0)
  const totalSpent = filteredClients.reduce((a, c) => a + (c.spent || 0), 0)
  const totalSaldo = totalBudget - totalSpent
  const diasDecorridos = getDiasDecorridos()

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

  const s = {
    app: { maxWidth: 900, margin: '0 auto', padding: '0 1rem 3rem', fontFamily: 'system-ui, sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 0 1rem', borderBottom: '0.5px solid #e5e7eb', marginBottom: '1.5rem' },
    title: { fontSize: 20, fontWeight: 500, color: '#111' },
    sub: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
    summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '1.5rem' },
    metricCard: { background: '#f9fafb', borderRadius: 8, padding: '1rem' },
    metricLabel: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
    metricValue: { fontSize: 20, fontWeight: 500, color: '#111' },
    filterSection: { marginBottom: '1.25rem' },
    filterRow: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 },
    filterLabel: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 60 },
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

  const summaryLabel = clientFilter !== 'all' ? clientFilter : platformFilter !== 'all' ? PLATFORM_LABELS[platformFilter] : 'Todos os clientes'

  return (
    <div style={s.app}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Monitor de budget — GZ Marketing</div>
          <div style={s.sub}>
            {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })} · dia {diasDecorridos} de {new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate()}
            {lastUpdated && ` · atualizado às ${lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleRefresh} disabled={refreshing} style={{ fontSize: 13 }}>
            {refreshing ? 'Atualizando...' : '↻ Atualizar'}
          </button>
          <button onClick={() => setShowAddModal(true)} style={{ fontSize: 13 }}>+ Cliente</button>
        </div>
      </div>

      <div style={s.filterSection}>
        <div style={s.filterRow}>
          <span style={s.filterLabel}>Cliente</span>
          <button style={filterBtnStyle(clientFilter === 'all')} onClick={() => setClientFilter('all')}>Todos</button>
          {clientNames.map(name => (
            <button key={name} style={filterBtnStyle(clientFilter === name)} onClick={() => setClientFilter(name)}>
              {name}
            </button>
          ))}
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
        Exibindo: <strong style={{ color: '#374151' }}>{summaryLabel}</strong> · {filteredClients.length} card{filteredClients.length !== 1 ? 's' : ''}
      </div>
      <div style={s.summaryGrid}>
        <div style={s.metricCard}>
          <div style={s.metricLabel}>budget total</div>
          <div style={s.metricValue}>{fmt(totalBudget)}</div>
        </div>
        <div style={s.metricCard}>
          <div style={s.metricLabel}>investido até hoje</div>
          <div style={{ ...s.metricValue, color: '#d97706' }}>{fmt(totalSpent)}</div>
        </div>
        <div style={s.metricCard}>
          <div style={s.metricLabel}>saldo disponível</div>
          <div style={{ ...s.metricValue, color: '#16a34a' }}>{fmt(totalSaldo)}</div>
        </div>
        <div style={s.metricCard}>
          <div style={s.metricLabel}>em alerta</div>
          <div style={{ ...s.metricValue, color: alertCount > 0 ? '#dc2626' : '#16a34a' }}>
            {alertCount} de {filteredClients.length}
          </div>
        </div>
      </div>

      {clients.length === 0 ? (
        <div style={s.emptyState}>
          <p>Nenhum cliente cadastrado ainda.</p>
          <button onClick={() => setShowAddModal(true)} style={{ marginTop: 12, fontSize: 13 }}>+ Adicionar primeiro cliente</button>
        </div>
      ) : filteredClients.length === 0 ? (
        <div style={s.emptyState}>
          <p>Nenhum card encontrado para o filtro selecionado.</p>
        </div>
      ) : (
        platformGroups.map(group => (
          <div key={group.platform}>
            {platformFilter === 'all' && (
              <div style={s.sectionTitle}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: group.platform === 'facebook_ads' ? '#1a56db' : group.platform === 'google_ads' ? '#d97706' : group.platform === 'linkedin_ads' ? '#1e40af' : '#9d174d', display: 'inline-block' }} />
                {PLATFORM_LABELS[group.platform] || group.platform}
                <span style={{ fontWeight: 400, color: '#d1d5db' }}>· {group.items.length} cliente{group.items.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            <div style={s.grid}>
              {group.items.map(c => (
                <ClientCard
                  key={c.id}
                  client={{ ...c, platform_label: PLATFORM_LABELS[c.platform] }}
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
        ℹ Dias estimados = saldo disponível ÷ média de gasto diário (spend acumulado ÷ dias decorridos no mês)
      </div>

      {(showAddModal || editClient) && (
        <ClientModal
          editData={editClient}
          onClose={() => { setShowAddModal(false); setEditClient(null) }}
          onSave={handleSaveClient}
        />
      )}

      {aporteClient && (
        <AporteModal
          client={aporteClient}
          onClose={() => setAporteClient(null)}
          onSave={handleSaveAporte}
        />
      )}
    </div>
  )
}
