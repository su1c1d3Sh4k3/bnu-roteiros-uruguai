import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Tour {
  id: string;
  nome: string;
  valor_por_pessoa: number;
  emoji: string;
  ativo: boolean;
}

interface Combo {
  id: string;
  nome: string;
  emoji: string;
  description: string;
  tour_ids: string[];
  preco_combo: number;
  dias_min: number;
  image_url: string;
  ativo: boolean;
  sort_order: number;
}

const EMPTY: Omit<Combo, 'id'> = {
  nome: '', emoji: '🎁', description: '', tour_ids: [], preco_combo: 0,
  dias_min: 1, image_url: '', ativo: true, sort_order: 99,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 11px', border: '1px solid #CBD5E1',
  borderRadius: 6, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#475569',
  marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em',
};

export default function ComboManager() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Combo | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [combosRes, toursRes] = await Promise.all([
      supabase.from('combos').select('*').order('sort_order'),
      supabase.from('tours').select('id, nome, valor_por_pessoa, emoji, ativo').eq('ativo', true).order('sort_order'),
    ]);
    setCombos(combosRes.data || []);
    setTours(toursRes.data || []);
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
      nome: editing.nome, emoji: editing.emoji, description: editing.description,
      tour_ids: editing.tour_ids, preco_combo: editing.preco_combo,
      dias_min: editing.dias_min, image_url: editing.image_url,
      ativo: editing.ativo, sort_order: editing.sort_order,
    };
    let error;
    if (isNew) {
      if (!editing.id) { notify('ID é obrigatório', false); setSaving(false); return; }
      ({ error } = await supabase.from('combos').insert({ id: editing.id, ...payload }));
    } else {
      ({ error } = await supabase.from('combos').update(payload).eq('id', editing.id));
    }
    if (error) { notify('Erro: ' + error.message, false); }
    else { notify('Salvo!'); setEditing(null); load(); }
    setSaving(false);
  };

  const toggleTour = (tourId: string) => {
    if (!editing) return;
    const ids = editing.tour_ids.includes(tourId)
      ? editing.tour_ids.filter(id => id !== tourId)
      : [...editing.tour_ids, tourId];
    setEditing({ ...editing, tour_ids: ids });
  };

  const remove = async (id: string, nome: string) => {
    if (!confirm(`Excluir combo "${nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from('combos').delete().eq('id', id);
    if (error) notify('Erro: ' + error.message, false);
    else { notify('Combo excluído!'); load(); }
  };

  const precoIndividual = (tourIds: string[]) =>
    tourIds.reduce((sum, id) => sum + (tours.find(t => t.id === id)?.valor_por_pessoa || 0), 0);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Carregando combos...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1E293B' }}>Combos</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>Pacotes de passeios com desconto</p>
        </div>
        <button onClick={() => { setIsNew(true); setEditing({ id: '', ...EMPTY }); }} style={{
          padding: '8px 16px', background: '#0D3B8C', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          + Novo Combo
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
        {combos.map(c => {
          const soma = precoIndividual(c.tour_ids);
          const desconto = soma > 0 ? Math.round((1 - c.preco_combo / soma) * 100) : 0;
          return (
            <div key={c.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1E293B' }}>{c.emoji} {c.nome}</div>
                  <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>{c.description}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: c.ativo ? '#D1FAE5' : '#FEE2E2',
                    color: c.ativo ? '#065F46' : '#991B1B',
                  }}>{c.ativo ? 'Ativo' : 'Inativo'}</span>
                  <button onClick={() => { setIsNew(false); setEditing({ ...c }); }} style={{
                    padding: '6px 14px', background: '#EFF6FF', color: '#0D3B8C',
                    border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Editar
                  </button>
                  <button onClick={() => remove(c.id, c.nome)} style={{
                    padding: '6px 10px', background: '#FEE2E2', color: '#991B1B',
                    border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Excluir
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Preco Individual</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#64748B', textDecoration: 'line-through' }}>R$ {soma.toFixed(0)}</div>
                </div>
                <div style={{ background: '#D1FAE5', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: '#065F46', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Preco Combo</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#065F46' }}>R$ {c.preco_combo.toFixed(0)}</div>
                </div>
                <div style={{ background: '#FEF3C7', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: '#92400E', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Desconto</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#92400E' }}>{desconto}%</div>
                </div>
              </div>

              <div style={{ fontSize: 13, color: '#475569' }}>
                <strong>Passeios:</strong> {c.tour_ids.map(id => tours.find(t => t.id === id)?.nome || id).join(' + ')}
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                Dias minimos: {c.dias_min} | Ordem: {c.sort_order}
              </div>
            </div>
          );
        })}
        {combos.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Nenhum combo cadastrado</div>}
      </div>

      {/* Modal */}
      {editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={e => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E293B' }}>
                {isNew ? 'Novo Combo' : `Editar: ${editing.nome}`}
              </h3>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}>x</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {isNew && (
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>ID (slug unico)</label>
                  <input style={inputStyle} value={editing.id} onChange={e => setEditing(p => p ? { ...p, id: e.target.value } : p)} placeholder="ex: combo_3cidades" />
                </div>
              )}

              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Nome do Combo</label>
                <input style={inputStyle} value={editing.nome} onChange={e => setEditing(p => p ? { ...p, nome: e.target.value } : p)} />
              </div>

              <div>
                <label style={labelStyle}>Emoji</label>
                <input style={inputStyle} value={editing.emoji} onChange={e => setEditing(p => p ? { ...p, emoji: e.target.value } : p)} />
              </div>

              <div>
                <label style={labelStyle}>Preco Combo (R$/pessoa)</label>
                <input style={inputStyle} type="number" value={editing.preco_combo} onChange={e => setEditing(p => p ? { ...p, preco_combo: parseFloat(e.target.value) || 0 } : p)} />
              </div>

              <div>
                <label style={labelStyle}>Dias minimos</label>
                <input style={inputStyle} type="number" value={editing.dias_min} onChange={e => setEditing(p => p ? { ...p, dias_min: parseInt(e.target.value) || 1 } : p)} />
              </div>

              <div>
                <label style={labelStyle}>Ordem</label>
                <input style={inputStyle} type="number" value={editing.sort_order} onChange={e => setEditing(p => p ? { ...p, sort_order: parseInt(e.target.value) || 0 } : p)} />
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Descricao</label>
                <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={editing.description} onChange={e => setEditing(p => p ? { ...p, description: e.target.value } : p)} />
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Passeios incluidos</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, maxHeight: 200, overflow: 'auto', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12 }}>
                  {tours.map(t => (
                    <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#1E293B' }}>
                      <input type="checkbox" checked={editing.tour_ids.includes(t.id)} onChange={() => toggleTour(t.id)} style={{ width: 16, height: 16 }} />
                      <span>{t.emoji} {t.nome} - R${t.valor_por_pessoa}/pessoa</span>
                    </label>
                  ))}
                </div>
                {editing.tour_ids.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 13, color: '#475569' }}>
                    Soma individual: <strong>R$ {precoIndividual(editing.tour_ids).toFixed(0)}</strong>
                    {editing.preco_combo > 0 && (
                      <span style={{ color: '#065F46', marginLeft: 12 }}>
                        Desconto: {Math.round((1 - editing.preco_combo / precoIndividual(editing.tour_ids)) * 100)}%
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="c_ativo" checked={editing.ativo} onChange={e => setEditing(p => p ? { ...p, ativo: e.target.checked } : p)} style={{ width: 16, height: 16 }} />
                <label htmlFor="c_ativo" style={{ fontSize: 14, color: '#475569', fontWeight: 600 }}>Ativo</label>
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
