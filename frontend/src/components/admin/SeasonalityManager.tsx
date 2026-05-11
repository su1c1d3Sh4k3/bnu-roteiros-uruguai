import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface SeasonalRule {
  id: number;
  city_id: string;
  months: number[];
  percentage: number;
  label: string;
  ativo: boolean;
}

interface City { id: string; nome: string; emoji: string; }

const MONTHS = [
  { id: 1, label: 'Janeiro', short: 'Jan' },
  { id: 2, label: 'Fevereiro', short: 'Fev' },
  { id: 3, label: 'Marco', short: 'Mar' },
  { id: 4, label: 'Abril', short: 'Abr' },
  { id: 5, label: 'Maio', short: 'Mai' },
  { id: 6, label: 'Junho', short: 'Jun' },
  { id: 7, label: 'Julho', short: 'Jul' },
  { id: 8, label: 'Agosto', short: 'Ago' },
  { id: 9, label: 'Setembro', short: 'Set' },
  { id: 10, label: 'Outubro', short: 'Out' },
  { id: 11, label: 'Novembro', short: 'Nov' },
  { id: 12, label: 'Dezembro', short: 'Dez' },
];

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

export default function SeasonalityManager() {
  const [rules, setRules] = useState<SeasonalRule[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [adding, setAdding] = useState(false);
  const [newRule, setNewRule] = useState({ city_id: '', months: [] as number[], percentage: '', label: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from('seasonal_rules').select('*').order('city_id').order('id'),
      supabase.from('cities').select('id,nome,emoji').order('sort_order'),
    ]);
    setRules(r || []);
    setCities((c || []).filter(x => ['mvd', 'pde', 'col'].includes(x.id)));
    setLoading(false);
  };

  const notify = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const cityName = (id: string) => cities.find(c => c.id === id)?.nome || id;

  const toggleActive = async (rule: SeasonalRule) => {
    setSaving(rule.id);
    const { error } = await supabase.from('seasonal_rules').update({ ativo: !rule.ativo }).eq('id', rule.id);
    if (error) notify('Erro: ' + error.message, false);
    else { notify(rule.ativo ? 'Regra desativada' : 'Regra ativada'); load(); }
    setSaving(null);
  };

  const updateRule = async (rule: SeasonalRule, field: string, value: unknown) => {
    setSaving(rule.id);
    const { error } = await supabase.from('seasonal_rules').update({ [field]: value }).eq('id', rule.id);
    if (error) notify('Erro: ' + error.message, false);
    else { notify('Salvo!'); load(); }
    setSaving(null);
  };

  const deleteRule = async (rule: SeasonalRule) => {
    if (!confirm(`Excluir regra "${rule.label}" de ${cityName(rule.city_id)}?`)) return;
    const { error } = await supabase.from('seasonal_rules').delete().eq('id', rule.id);
    if (error) notify('Erro: ' + error.message, false);
    else { notify('Regra excluida'); load(); }
  };

  const addRule = async () => {
    if (!newRule.city_id || newRule.months.length === 0 || !newRule.percentage) {
      notify('Preencha cidade, meses e percentual', false);
      return;
    }
    setSaving(-1);
    const { error } = await supabase.from('seasonal_rules').insert({
      city_id: newRule.city_id,
      months: newRule.months.sort((a, b) => a - b),
      percentage: parseFloat(newRule.percentage),
      label: newRule.label || newRule.months.map(m => MONTHS.find(x => x.id === m)?.short).join(', '),
    });
    if (error) notify('Erro: ' + error.message, false);
    else {
      notify('Regra criada!');
      setNewRule({ city_id: '', months: [], percentage: '', label: '' });
      setAdding(false);
      load();
    }
    setSaving(null);
  };

  const toggleMonth = (months: number[], m: number) =>
    months.includes(m) ? months.filter(x => x !== m) : [...months, m];

  const MonthSelector = ({ selected, onChange }: { selected: number[]; onChange: (m: number[]) => void }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {MONTHS.map(m => (
        <button key={m.id} onClick={() => onChange(toggleMonth(selected, m.id))}
          style={{
            padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: selected.includes(m.id) ? '2px solid #0D3B8C' : '1px solid #E2E8F0',
            background: selected.includes(m.id) ? '#EFF6FF' : 'white',
            color: selected.includes(m.id) ? '#0D3B8C' : '#94A3B8',
          }}>
          {m.short}
        </button>
      ))}
    </div>
  );

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Carregando...</div>;

  const groupedByCidade = cities.map(city => ({
    city,
    rules: rules.filter(r => r.city_id === city.id),
  }));

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1E293B' }}>Sazonalidade</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
            Regras de aumento sazonal nos precos de hospedagem. O maior percentual aplicavel sera usado no calculo.
          </p>
        </div>
        <button onClick={() => setAdding(!adding)} style={{
          padding: '8px 16px', background: '#0D3B8C', color: '#fff', border: 'none', borderRadius: 8,
          fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          + Nova regra
        </button>
      </div>

      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14,
          background: msg.ok ? '#D1FAE5' : '#FEE2E2',
          color: msg.ok ? '#065F46' : '#991B1B',
        }}>{msg.text}</div>
      )}

      {adding && (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#1E293B' }}>Nova regra de sazonalidade</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Cidade</label>
              <select style={inputStyle} value={newRule.city_id} onChange={e => setNewRule(p => ({ ...p, city_id: e.target.value }))}>
                <option value="">Selecione...</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Aumento (%)</label>
              <input style={inputStyle} type="number" placeholder="ex: 20" value={newRule.percentage}
                onChange={e => setNewRule(p => ({ ...p, percentage: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Descricao</label>
            <input style={inputStyle} placeholder="ex: Julho e feriados" value={newRule.label}
              onChange={e => setNewRule(p => ({ ...p, label: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Meses</label>
            <MonthSelector selected={newRule.months} onChange={months => setNewRule(p => ({ ...p, months }))} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addRule} disabled={saving === -1} style={{
              padding: '8px 20px', background: '#0D3B8C', color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>{saving === -1 ? 'Salvando...' : 'Criar regra'}</button>
            <button onClick={() => { setAdding(false); setNewRule({ city_id: '', months: [], percentage: '', label: '' }); }}
              style={{ padding: '8px 20px', background: '#F1F5F9', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {groupedByCidade.map(({ city, rules: cityRules }) => (
        <div key={city.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>{city.emoji}</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1E293B' }}>{city.nome}</span>
            {cityRules.length === 0 && (
              <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 8 }}>Sem regras sazonais</span>
            )}
          </div>
          {cityRules.length > 0 && (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cityRules.map(rule => (
                <RuleCard key={rule.id} rule={rule} saving={saving}
                  onToggle={() => toggleActive(rule)}
                  onUpdate={(field, value) => updateRule(rule, field, value)}
                  onDelete={() => deleteRule(rule)} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RuleCard({ rule, saving, onToggle, onUpdate, onDelete }: {
  rule: SeasonalRule; saving: number | null;
  onToggle: () => void; onUpdate: (f: string, v: unknown) => void; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pct, setPct] = useState(String(rule.percentage));
  const [label, setLabel] = useState(rule.label);
  const [months, setMonths] = useState(rule.months);

  const save = () => {
    onUpdate('percentage', parseFloat(pct) || 0);
    // Update months and label in separate calls would be complex, do it in one
    // Actually we need to call update for each changed field
    if (label !== rule.label) onUpdate('label', label);
    if (JSON.stringify(months.sort()) !== JSON.stringify(rule.months.sort())) onUpdate('months', months.sort((a, b) => a - b));
    setEditing(false);
  };

  const monthLabels = rule.months.map(m => MONTHS.find(x => x.id === m)?.short || m).join(', ');
  const isSaving = saving === rule.id;

  return (
    <div style={{
      border: '1px solid #E2E8F0', borderRadius: 10, padding: 14,
      opacity: rule.ativo ? 1 : 0.5, transition: 'opacity 0.2s',
    }}>
      {editing ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Aumento (%)</label>
              <input style={inputStyle} type="number" value={pct} onChange={e => setPct(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Descricao</label>
              <input style={inputStyle} value={label} onChange={e => setLabel(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Meses</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {MONTHS.map(m => (
                <button key={m.id} onClick={() => setMonths(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])}
                  style={{
                    padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: months.includes(m.id) ? '2px solid #0D3B8C' : '1px solid #E2E8F0',
                    background: months.includes(m.id) ? '#EFF6FF' : 'white',
                    color: months.includes(m.id) ? '#0D3B8C' : '#94A3B8',
                  }}>
                  {m.short}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={save} disabled={isSaving} style={{
              padding: '6px 14px', background: '#0D3B8C', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>{isSaving ? '...' : 'Salvar'}</button>
            <button onClick={() => { setEditing(false); setPct(String(rule.percentage)); setLabel(rule.label); setMonths(rule.months); }}
              style={{ padding: '6px 10px', background: '#F1F5F9', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>
              +{rule.percentage}%
              <span style={{ fontWeight: 400, color: '#64748B', marginLeft: 8, fontSize: 13 }}>{rule.label}</span>
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Meses: {monthLabels}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={onToggle} disabled={isSaving} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: 'none', background: rule.ativo ? '#D1FAE5' : '#FEE2E2',
              color: rule.ativo ? '#065F46' : '#991B1B',
            }}>{rule.ativo ? 'Ativa' : 'Inativa'}</button>
            <button onClick={() => setEditing(true)} style={{
              padding: '4px 10px', background: '#EFF6FF', color: '#0D3B8C', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>Editar</button>
            <button onClick={onDelete} style={{
              padding: '4px 10px', background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>Excluir</button>
          </div>
        </div>
      )}
    </div>
  );
}

