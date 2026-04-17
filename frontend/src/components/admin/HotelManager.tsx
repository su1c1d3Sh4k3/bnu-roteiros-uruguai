import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface HotelPrice {
  id: number;
  city_id: string;
  hotel_style_id: string;
  price_per_night: number;
  season_note: string;
}

interface City { id: string; nome: string; emoji: string; }
interface HotelStyle { id: string; label: string; stars: string; }

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

export default function HotelManager() {
  const [prices, setPrices] = useState<HotelPrice[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [styles, setStyles] = useState<HotelStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, { price: string; note: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: c }, { data: s }] = await Promise.all([
      supabase.from('hotel_prices').select('*').order('city_id').order('hotel_style_id'),
      supabase.from('cities').select('id,nome,emoji').order('sort_order'),
      supabase.from('hotel_styles').select('id,label,stars').order('sort_order'),
    ]);
    setPrices(p || []);
    setCities((c || []).filter(x => ['mvd', 'pde', 'col'].includes(x.id)));
    setStyles(s || []);
    setLoading(false);
  };

  const notify = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const getPrice = (cityId: string, styleId: string) =>
    prices.find(p => p.city_id === cityId && p.hotel_style_id === styleId);

  const key = (cityId: string, styleId: string) => `${cityId}__${styleId}`;

  const startEdit = (p: HotelPrice) => {
    const k = key(p.city_id, p.hotel_style_id);
    setEditing(prev => ({ ...prev, [k]: { price: String(p.price_per_night), note: p.season_note } }));
  };

  const save = async (p: HotelPrice) => {
    const k = key(p.city_id, p.hotel_style_id);
    const d = editing[k];
    if (!d) return;
    setSaving(k);
    const { error } = await supabase.from('hotel_prices').update({
      price_per_night: parseFloat(d.price) || 0,
      season_note: d.note,
    }).eq('id', p.id);
    if (error) { notify('Erro: ' + error.message, false); }
    else { notify('Preço salvo!'); setEditing(prev => { const n = { ...prev }; delete n[k]; return n; }); load(); }
    setSaving(null);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Carregando hotéis...</div>;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1E293B' }}>Hotéis</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
          Preços aproximados por pessoa/noite (quarto duplo). Clique em Editar para alterar.
        </p>
      </div>

      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14,
          background: msg.ok ? '#D1FAE5' : '#FEE2E2',
          color: msg.ok ? '#065F46' : '#991B1B',
        }}>{msg.text}</div>
      )}

      {cities.map(city => (
        <div key={city.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>{city.emoji}</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1E293B' }}>{city.nome}</span>
          </div>
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {styles.map(style => {
              const p = getPrice(city.id, style.id);
              const k = key(city.id, style.id);
              const isEditing = !!editing[k];

              return (
                <div key={style.id} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 14 }}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{style.label}</span>
                    <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 6 }}>{style.stars}</span>
                  </div>

                  {isEditing ? (
                    <>
                      <div style={{ marginBottom: 6 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 3 }}>Preço/noite (R$)</label>
                        <input style={inputStyle} type="number" value={editing[k].price}
                          onChange={e => setEditing(prev => ({ ...prev, [k]: { ...prev[k], price: e.target.value } }))} />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 3 }}>Nota sazonal</label>
                        <input style={inputStyle} value={editing[k].note}
                          onChange={e => setEditing(prev => ({ ...prev, [k]: { ...prev[k], note: e.target.value } }))}
                          placeholder="ex: Julho +20%" />
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => p && save(p)} disabled={saving === k} style={{ flex: 1, padding: '6px 0', background: '#0D3B8C', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          {saving === k ? '...' : 'Salvar'}
                        </button>
                        <button onClick={() => setEditing(prev => { const n = { ...prev }; delete n[k]; return n; })} style={{ padding: '6px 10px', background: '#F1F5F9', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                          ×
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#0D3B8C', marginBottom: 4 }}>
                        R$ {p?.price_per_night?.toFixed(2) || '—'}
                      </div>
                      {p?.season_note && (
                        <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8 }}>{p.season_note}</div>
                      )}
                      {p && (
                        <button onClick={() => startEdit(p)} style={{ padding: '5px 12px', background: '#EFF6FF', color: '#0D3B8C', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          Editar
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ padding: 16, background: '#FFFBEB', borderRadius: 10, border: '1px solid #FDE68A', fontSize: 13, color: '#92400E' }}>
        Valores são aproximados e por pessoa/noite em quarto duplo. Avisos de sazonalidade aparecem no orçamento ao cliente.
      </div>
    </div>
  );
}
