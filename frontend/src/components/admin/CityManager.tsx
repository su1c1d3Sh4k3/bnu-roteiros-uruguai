import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface City {
  id: string;
  nome: string;
  emoji: string;
  description: string;
  sort_order: number;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 11px',
  border: '1px solid #CBD5E1',
  borderRadius: 6,
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

export default function CityManager() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<City>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [newMode, setNewMode] = useState(false);
  const [newDraft, setNewDraft] = useState<City>({ id: '', nome: '', emoji: '📍', description: '', sort_order: 99 });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('cities').select('*').order('sort_order');
    setCities(data || []);
    setLoading(false);
  };

  const notify = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const startEdit = (c: City) => {
    setEditingId(c.id);
    setDraft({ ...c });
    setNewMode(false);
  };

  const cancelEdit = () => { setEditingId(null); setDraft({}); };

  const save = async (id: string) => {
    setSaving(true);
    const { error } = await supabase.from('cities').update({
      nome: draft.nome,
      emoji: draft.emoji,
      description: draft.description,
      sort_order: draft.sort_order,
    }).eq('id', id);
    if (error) { notify('Erro: ' + error.message, false); }
    else { notify('Cidade salva!'); cancelEdit(); load(); }
    setSaving(false);
  };

  const saveNew = async () => {
    if (!newDraft.id || !newDraft.nome) { notify('ID e Nome são obrigatórios', false); return; }
    setSaving(true);
    const { error } = await supabase.from('cities').insert(newDraft);
    if (error) { notify('Erro: ' + error.message, false); }
    else { notify('Cidade criada!'); setNewMode(false); setNewDraft({ id: '', nome: '', emoji: '📍', description: '', sort_order: 99 }); load(); }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Carregando cidades...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1E293B' }}>Cidades</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>{cities.length} cidade(s) cadastrada(s)</p>
        </div>
        <button onClick={() => setNewMode(true)} style={{
          padding: '8px 16px', background: '#0D3B8C', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          + Nova Cidade
        </button>
      </div>

      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14,
          background: msg.ok ? '#D1FAE5' : '#FEE2E2',
          color: msg.ok ? '#065F46' : '#991B1B',
        }}>{msg.text}</div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              {['Emoji', 'ID', 'Nome', 'Descrição', 'Ordem', 'Ações'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* New row */}
            {newMode && (
              <tr style={{ background: '#EFF6FF', borderBottom: '1px solid #DBEAFE' }}>
                <td style={{ padding: '10px 16px' }}>
                  <input style={{ ...inputStyle, width: 60 }} value={newDraft.emoji} onChange={e => setNewDraft(p => ({ ...p, emoji: e.target.value }))} />
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <input style={inputStyle} value={newDraft.id} onChange={e => setNewDraft(p => ({ ...p, id: e.target.value }))} placeholder="slug único" />
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <input style={inputStyle} value={newDraft.nome} onChange={e => setNewDraft(p => ({ ...p, nome: e.target.value }))} placeholder="Nome" />
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <input style={inputStyle} value={newDraft.description} onChange={e => setNewDraft(p => ({ ...p, description: e.target.value }))} placeholder="Descrição curta" />
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <input style={{ ...inputStyle, width: 60 }} type="number" value={newDraft.sort_order} onChange={e => setNewDraft(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={saveNew} disabled={saving} style={{ padding: '5px 12px', background: '#0D3B8C', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      {saving ? '...' : 'Criar'}
                    </button>
                    <button onClick={() => setNewMode(false)} style={{ padding: '5px 10px', background: '#F1F5F9', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                      ×
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {cities.map((c, i) => (
              <tr key={c.id} style={{ borderBottom: i < cities.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                {editingId === c.id ? (
                  <>
                    <td style={{ padding: '10px 16px' }}>
                      <input style={{ ...inputStyle, width: 60 }} value={draft.emoji || ''} onChange={e => setDraft(p => ({ ...p, emoji: e.target.value }))} />
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 14, color: '#94A3B8' }}>{c.id}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <input style={inputStyle} value={draft.nome || ''} onChange={e => setDraft(p => ({ ...p, nome: e.target.value }))} />
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <input style={inputStyle} value={draft.description || ''} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))} />
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <input style={{ ...inputStyle, width: 60 }} type="number" value={draft.sort_order ?? 0} onChange={e => setDraft(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => save(c.id)} disabled={saving} style={{ padding: '5px 12px', background: '#0D3B8C', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          {saving ? '...' : 'Salvar'}
                        </button>
                        <button onClick={cancelEdit} style={{ padding: '5px 10px', background: '#F1F5F9', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                          ×
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '12px 16px', fontSize: 20 }}>{c.emoji}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#94A3B8', fontFamily: 'monospace' }}>{c.id}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#1E293B' }}>{c.nome}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748B' }}>{c.description}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748B' }}>{c.sort_order}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => startEdit(c)} style={{ padding: '6px 14px', background: '#EFF6FF', color: '#0D3B8C', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Editar
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
