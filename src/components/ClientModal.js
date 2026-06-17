import { useState, useEffect } from 'react'
import { getProjects } from '../reporteiService'

const PLATFORMS = [
  { value: 'facebook_ads', label: 'Meta Ads' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'linkedin_ads', label: 'LinkedIn Ads' },
  { value: 'tiktok_ads', label: 'TikTok Ads' },
]

export default function ClientModal({ onClose, onSave, editData }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    project_id: '',
    project_name: '',
    platform: 'facebook_ads',
    budget_mensal: '',
    alerta_dias: 10,
  })

  useEffect(() => {
    getProjects().then(p => { setProjects(p); setLoading(false) })
    if (editData) {
      setForm({
        project_id: editData.project_id,
        project_name: editData.project_name,
        platform: editData.platform,
        budget_mensal: editData.budget_mensal,
        alerta_dias: editData.alerta_dias,
      })
    }
  }, [editData])

  function handleProjectChange(e) {
    const id = parseInt(e.target.value)
    const proj = projects.find(p => p.id === id)
    setForm(f => ({ ...f, project_id: id, project_name: proj?.name || '' }))
  }

  function handleSubmit() {
    if (!form.project_id || !form.budget_mensal) return alert('Preencha todos os campos.')
    onSave({
      project_id: form.project_id,
      project_name: form.project_name,
      platform: form.platform,
      budget_mensal: parseFloat(form.budget_mensal),
      alerta_dias: parseInt(form.alerta_dias),
      aportes: editData?.aportes || []
    })
  }

  const s = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modal: { background: 'var(--color-bg, #fff)', border: '0.5px solid #ddd', borderRadius: 12, padding: '1.5rem', width: 420, maxWidth: '90vw' },
    title: { fontSize: 16, fontWeight: 500, marginBottom: '1.25rem', color: '#111' },
    label: { fontSize: 12, color: '#666', marginBottom: 4, display: 'block' },
    field: { marginBottom: '1rem' },
    input: { width: '100%', fontSize: 14, padding: '8px 10px', borderRadius: 8, border: '0.5px solid #ccc', background: 'transparent', color: 'inherit' },
    row: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.25rem' },
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.title}>{editData ? 'Editar cliente' : 'Novo cliente'}</div>

        {loading ? <p style={{ fontSize: 13, color: '#888' }}>Carregando projetos...</p> : (
          <>
            <div style={s.field}>
              <label style={s.label}>Projeto (Reportei)</label>
              <select style={s.input} value={form.project_id} onChange={handleProjectChange} disabled={!!editData}>
                <option value="">Selecione...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div style={s.field}>
              <label style={s.label}>Plataforma</label>
              <select style={s.input} value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} disabled={!!editData}>
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            <div style={s.field}>
              <label style={s.label}>Budget mensal (R$)</label>
              <input style={s.input} type="number" value={form.budget_mensal} onChange={e => setForm(f => ({ ...f, budget_mensal: e.target.value }))} placeholder="ex: 3000" />
            </div>

            <div style={s.field}>
              <label style={s.label}>Alertar quando restar (dias)</label>
              <input style={s.input} type="number" value={form.alerta_dias} onChange={e => setForm(f => ({ ...f, alerta_dias: e.target.value }))} />
            </div>
          </>
        )}

        <div style={s.row}>
          <button onClick={onClose}>Cancelar</button>
          <button onClick={handleSubmit} style={{ marginLeft: 8 }}>Salvar</button>
        </div>
      </div>
    </div>
  )
}
