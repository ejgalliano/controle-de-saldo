import { useState } from 'react'

export default function AporteModal({ client, onClose, onSave }) {
  const [valor, setValor] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])

  function handleSubmit() {
    if (!valor) return alert('Informe o valor do aporte.')
    const novoAporte = { valor: parseFloat(valor), data }
    const aportes = [...(client.aportes || []), novoAporte]
    onSave({ ...client, aportes })
  }

  const s = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modal: { background: 'var(--color-bg, #fff)', border: '0.5px solid #ddd', borderRadius: 12, padding: '1.5rem', width: 380, maxWidth: '90vw' },
    title: { fontSize: 16, fontWeight: 500, marginBottom: 4, color: '#111' },
    sub: { fontSize: 13, color: '#888', marginBottom: '1.25rem' },
    label: { fontSize: 12, color: '#666', marginBottom: 4, display: 'block' },
    field: { marginBottom: '1rem' },
    input: { width: '100%', fontSize: 14, padding: '8px 10px', borderRadius: 8, border: '0.5px solid #ccc', background: 'transparent', color: 'inherit' },
    row: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.25rem' },
  }

  const totalAportes = (client.aportes || []).reduce((a, x) => a + x.valor, 0)

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.title}>Registrar aporte PIX</div>
        <div style={s.sub}>{client.project_name} · {client.platform_label}</div>

        {totalAportes > 0 && (
          <div style={{ fontSize: 12, color: '#666', marginBottom: '1rem', padding: '8px 10px', background: '#f5f5f5', borderRadius: 8 }}>
            Aportes anteriores: R$ {totalAportes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        )}

        <div style={s.field}>
          <label style={s.label}>Valor (R$)</label>
          <input style={s.input} type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="ex: 1000" autoFocus />
        </div>

        <div style={s.field}>
          <label style={s.label}>Data do aporte</label>
          <input style={s.input} type="date" value={data} onChange={e => setData(e.target.value)} />
        </div>

        <div style={s.row}>
          <button onClick={onClose}>Cancelar</button>
          <button onClick={handleSubmit} style={{ marginLeft: 8 }}>Registrar</button>
        </div>
      </div>
    </div>
  )
}
