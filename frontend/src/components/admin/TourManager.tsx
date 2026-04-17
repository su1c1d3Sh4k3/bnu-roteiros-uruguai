import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

interface Tour {
  id: string;
  nome: string;
  valor_por_pessoa: number;
  emoji: string;
  description: string;
  duration: string;
  cidade_base: string;
  image_url: string;
  link_url: string;
  private_pricing: Record<string, number>;
  ativo: boolean;
  sort_order: number;
}

interface City {
  id: string;
  nome: string;
  emoji: string;
}

const EMPTY_TOUR: Omit<Tour, 'id'> = {
  nome: '',
  valor_por_pessoa: 0,
  emoji: '🗺️',
  description: '',
  duration: '',
  cidade_base: 'mvd',
  image_url: '',
  link_url: '',
  private_pricing: {},
  ativo: true,
  sort_order: 0,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #CBD5E1',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#475569',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

export default function TourManager() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Tour | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from('tours').select('*').order('sort_order'),
      supabase.from('cities').select('id,nome,emoji').order('sort_order'),
    ]);
    setTours(t || []);
    setCities(c || []);
    setLoading(false);
  };

  const notify = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const openNew = () => {
    setIsNew(true);
    setEditing({ id: '', ...EMPTY_TOUR });
  };

  const openEdit = (t: Tour) => {
    setIsNew(false);
    setEditing({ ...t, private_pricing: t.private_pricing || {} });
  };

  const close = () => setEditing(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `tours/${editing.id || 'new-' + Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('tour-images').upload(path, file, { upsert: true });
    if (error) { notify('Erro no upload: ' + error.message, false); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('tour-images').getPublicUrl(path);
    setEditing(prev => prev ? { ...prev, image_url: publicUrl } : prev);
    setUploading(false);
    notify('Imagem enviada!');
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const payload = {
      nome: editing.nome,
      valor_por_pessoa: editing.valor_por_pessoa,
      emoji: editing.emoji,
      description: editing.description,
      duration: editing.duration,
      cidade_base: editing.cidade_base,
      image_url: editing.image_url,
      link_url: editing.link_url,
      private_pricing: editing.private_pricing,
      ativo: editing.ativo,
      sort_order: editing.sort_order,
    };

    let error;
    if (isNew) {
      if (!editing.id) { notify('ID é obrigatório para novo passeio', false); setSaving(false); return; }
      ({ error } = await supabase.from('tours').insert({ id: editing.id, ...payload }));
    } else {
      ({ error } = await supabase.from('tours').update(payload).eq('id', editing.id));
    }

    if (error) { notify('Erro: ' + error.message, false); } else { notify('Salvo!'); close(); load(); }
    setSaving(false);
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    await supabase.from('tours').update({ ativo: !ativo }).eq('id', id);
    setTours(prev => prev.map(t => t.id === id ? { ...t, ativo: !ativo } : t));
  };

  const setPrivate = (key: string, val: string) => {
    if (!editing) return;
    setEditing(prev => prev ? { ...prev, private_pricing: { ...prev.private_pricing, [key]: parseFloat(val) || 0 } } : prev);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Carregando passeios...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1E293B' }}>Passeios</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>{tours.length} passeio(s) cadastrado(s)</p>
        </div>
        <button onClick={openNew} style={{
          padding: '8px 16px', background: '#0D3B8C', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          + Novo Passeio
        </button>
      </div>

      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14,
          background: msg.ok ? '#D1FAE5' : '#FEE2E2',
          color: msg.ok ? '#065F46' : '#991B1B',
        }}>{msg.text}</div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              {['', 'Nome', 'Preço/pessoa', 'Duração', 'Cidade Base', 'Status', 'Ações'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tours.map((t, i) => (
              <tr key={t.id} style={{ borderBottom: i < tours.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                <td style={{ padding: '12px 16px', fontSize: 20 }}>
                  {t.image_url
                    ? <img src={t.image_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                    : <span>{t.emoji}</span>}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 600, color: '#1E293B', fontSize: 14 }}>{t.nome}</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{t.id}</div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 14, color: '#1E293B', fontWeight: 600 }}>
                  R$ {t.valor_por_pessoa?.toFixed(2)}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748B' }}>{t.duration || '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748B' }}>
                  {cities.find(c => c.id === t.cidade_base)?.nome || t.cidade_base}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => toggleAtivo(t.id, t.ativo)} style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: t.ativo ? '#D1FAE5' : '#FEE2E2',
                    color: t.ativo ? '#065F46' : '#991B1B',
                  }}>
                    {t.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => openEdit(t)} style={{
                    padding: '6px 14px', background: '#EFF6FF', color: '#0D3B8C',
                    border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={e => { if (e.target === e.currentTarget) close(); }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640,
            maxHeight: '90vh', overflowY: 'auto', padding: 32,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E293B' }}>
                {isNew ? 'Novo Passeio' : `Editar: ${editing.nome}`}
              </h3>
              <button onClick={close} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {isNew && (
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={labelStyle}>ID (slug único)</label>
                  <input style={inputStyle} value={editing.id} onChange={e => setEditing(p => p ? { ...p, id: e.target.value } : p)} placeholder="ex: city_mvd" />
                </div>
              )}

              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Nome do Passeio</label>
                <input style={inputStyle} value={editing.nome} onChange={e => setEditing(p => p ? { ...p, nome: e.target.value } : p)} />
              </div>

              <div>
                <label style={labelStyle}>Preço por Pessoa (R$)</label>
                <input style={inputStyle} type="number" value={editing.valor_por_pessoa} onChange={e => setEditing(p => p ? { ...p, valor_por_pessoa: parseFloat(e.target.value) || 0 } : p)} />
              </div>

              <div>
                <label style={labelStyle}>Duração</label>
                <input style={inputStyle} value={editing.duration} onChange={e => setEditing(p => p ? { ...p, duration: e.target.value } : p)} placeholder="ex: 4h, 9h" />
              </div>

              <div>
                <label style={labelStyle}>Emoji</label>
                <input style={inputStyle} value={editing.emoji} onChange={e => setEditing(p => p ? { ...p, emoji: e.target.value } : p)} />
              </div>

              <div>
                <label style={labelStyle}>Cidade Base</label>
                <select style={{ ...inputStyle }} value={editing.cidade_base} onChange={e => setEditing(p => p ? { ...p, cidade_base: e.target.value } : p)}>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.nome}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Descrição</label>
                <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={editing.description} onChange={e => setEditing(p => p ? { ...p, description: e.target.value } : p)} />
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Link do Site</label>
                <input style={inputStyle} value={editing.link_url} onChange={e => setEditing(p => p ? { ...p, link_url: e.target.value } : p)} placeholder="https://..." />
              </div>

              {/* Image Upload */}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Foto do Passeio</label>
                {editing.image_url && (
                  <img src={editing.image_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input style={{ ...inputStyle, flex: 1 }} value={editing.image_url} onChange={e => setEditing(p => p ? { ...p, image_url: e.target.value } : p)} placeholder="URL da imagem ou use o upload abaixo" />
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
                    padding: '8px 14px', background: '#F1F5F9', border: '1px solid #CBD5E1',
                    borderRadius: 8, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>
                    {uploading ? 'Enviando...' : 'Upload'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
                </div>
              </div>

              {/* Private Pricing */}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Preços Privativos (total do grupo)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {['1-3', '4-9', '10-12', '12-15'].map(k => (
                    <div key={k}>
                      <label style={{ ...labelStyle, marginBottom: 2 }}>{k} pessoas</label>
                      <input style={inputStyle} type="number" value={editing.private_pricing[k] || ''} onChange={e => setPrivate(k, e.target.value)} placeholder="R$" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Ordem de exibição</label>
                <input style={inputStyle} type="number" value={editing.sort_order} onChange={e => setEditing(p => p ? { ...p, sort_order: parseInt(e.target.value) || 0 } : p)} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                <input type="checkbox" id="ativo" checked={editing.ativo} onChange={e => setEditing(p => p ? { ...p, ativo: e.target.checked } : p)} style={{ width: 16, height: 16 }} />
                <label htmlFor="ativo" style={{ fontSize: 14, color: '#475569', fontWeight: 600 }}>Passeio ativo</label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={close} style={{ padding: '10px 20px', background: '#F1F5F9', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#475569' }}>
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
