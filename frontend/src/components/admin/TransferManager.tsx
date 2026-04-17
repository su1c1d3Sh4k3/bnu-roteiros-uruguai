import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Transfer {
  id: string;
  nome: string;
  descricao: string;
  price_1_2: number;
  price_3_6: number;
  price_7_11: number;
  price_12_15: number;
  ativo: boolean;
  sort_order: number;
}

const EMPTY: Omit<Transfer, 'id'> = {
  nome: '', descricao: '', price_1_2: 0, price_3_6: 0, price_7_11: 0, price_12_15: 0, ativo: true, sort_order: 99,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 11px', border: '1px solid #CBD5E1',
  borderRadius: 6, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#475569',
  marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em',
};

export default function TransferManager() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Transfer | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('transfers').select('*').order('sort_order');
    setTransfers(data || []);
    setLoading(false);
  };

  const notify = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const payload = {
      nome: editing.nome,
      descricao: editing.descricao,
      price_1_2: editing.price_1_2,
      price_3_6: editing.price_3_6,
      price_7_11: editing.price_7_11,
      price_12_15: editing.price_12_15,
      ativo: editing.ativo,
      sort_order: editing.sort_order,
    };

    let error;
    if (isNew) {
      if (!editing.id) { notify('ID é obrigatório', false); setSaving(false); return; }
      ({ error } = await supabase.from('transfers').insert({ id: editing.id, ...payload }));
    } else {
      ({ error } = await supabase.from('transfers').update(payload).eq('id', editing.id));
    }

    if (error) { notify('Erro: ' + error.message, false); }
    else { notify('Salvo!'); setEditing(null); load(); }
    setSaving(false);
  };

  const fmt = (v: number) => `R$ ${v.toFixed(2)}`;

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Carregando transfers...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1E293B' }}>Transfers</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>Preços por trecho e tamanho de grupo</p>
        </div>
        <button onClick={() => { setIsNew(true); setEditing({ id: '', ...EMPTY }); }} style={{
          padding: '8px 16px', background: '#0D3B8C', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          + Novo Transfer
        </button>
      </div>

      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14,
          background: msg.ok ? '#D1FAE5' : '#FEE2E2',
          color: msg.ok ? '#065F46' : '#991B1B',
        }}>{msg.text}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {transfers.map(t => (
          <div key={t.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1E293B' }}>🚗 {t.nome}</div>
                {t.descricao && <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>{t.descricao}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: t.ativo ? '#D1FAE5' : '#FEE2E2',
                  color: t.ativo ? '#065F46' : '#991B1B',
                }}>{t.ativo ? 'Ativo' : 'Inativo'}</span>
                <button onClick={() => { setIsNew(false); setEditing({ ...t }); }} style={{
                  padding: '6px 14px', background: '#EFF6FF', color: '#0D3B8C',
                  border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                  Editar
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: '1-2 pessoas', value: t.price_1_2 },
                { label: '3-6 pessoas', value: t.price_3_6 },
                { label: '7-11 pessoas', value: t.price_7_11 },
                { label: '12-15 pessoas', value: t.price_12_15 },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0D3B8C' }}>{fmt(value)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={e => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E293B' }}>
                {isNew ? 'Novo Transfer' : `Editar: ${editing.nome}`}
              </h3>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {isNew && (
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>ID (slug único)</label>
                  <input style={inputStyle} value={editing.id} onChange={e => setEditing(p => p ? { ...p, id: e.target.value } : p)} placeholder="ex: aeroporto_mvd" />
                </div>
              )}

              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Nome da Rota</label>
                <input style={inputStyle} value={editing.nome} onChange={e => setEditing(p => p ? { ...p, nome: e.target.value } : p)} />
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Descrição</label>
                <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={editing.descricao} onChange={e => setEditing(p => p ? { ...p, descricao: e.target.value } : p)} />
              </div>

              {(['price_1_2', 'price_3_6', 'price_7_11', 'price_12_15'] as const).map((field, i) => (
                <div key={field}>
                  <label style={labelStyle}>{['1-2', '3-6', '7-11', '12-15'][i]} pessoas (R$)</label>
                  <input style={inputStyle} type="number" value={editing[field]} onChange={e => setEditing(p => p ? { ...p, [field]: parseFloat(e.target.value) || 0 } : p)} />
                </div>
              ))}

              <div>
                <label style={labelStyle}>Ordem</label>
                <input style={inputStyle} type="number" value={editing.sort_order} onChange={e => setEditing(p => p ? { ...p, sort_order: parseInt(e.target.value) || 0 } : p)} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                <input type="checkbox" id="t_ativo" checked={editing.ativo} onChange={e => setEditing(p => p ? { ...p, ativo: e.target.checked } : p)} style={{ width: 16, height: 16 }} />
                <label htmlFor="t_ativo" style={{ fontSize: 14, color: '#475569', fontWeight: 600 }}>Ativo</label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(null)} style={{ padding: '10px 20px', background: '#F1F5F9', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#475569' }}>
                Cancelar
              </button>
              <button onClick={save} disabled={saving} style={{
                padding: '10px 24px', background: '#0D3B8C', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
              }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
