import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import type { WizardAnswers, City, Tour, HotelStyle, TravelProfile, BudgetRange } from '../types/database';

import faviconSrc from '../assets/favicon.png';
const FAVICON_SRC = faviconSrc;

// ═══════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════

function BNULogo({ size = 48 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.18, overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
      <img src={FAVICON_SRC} alt="BNU" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  );
}

function TourImage({ id, nome, tours }: { id: string; nome: string; tours: Tour[] }) {
  const tour = tours.find(t => t.id === id);
  const src = tour?.image_url || '';
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0D3B8C, #1B6E3C)', fontSize: 32,
      }}>
        {tour?.emoji || '🗺️'}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={nome}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      onError={() => setErrored(true)}
    />
  );
}

// ═══════════════════════════════════════════════════════
// DATE RANGE PICKER
// ═══════════════════════════════════════════════════════

function DateRangePicker({ startDate, endDate, onChange }: {
  startDate: string; endDate: string;
  onChange: (start: string, end: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const DAYS_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y: number, m: number) => new Date(y, m, 1).getDay();

  const parseDate = (str: string): Date | null => {
    if (!str) return null;
    const [d, mo, y] = str.split('/');
    const dt = new Date(Number(y), Number(mo) - 1, Number(d));
    return isNaN(dt.getTime()) ? null : dt;
  };
  const formatDate = (dt: Date | null): string => {
    if (!dt) return '';
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  };

  const s = parseDate(startDate);
  const e = parseDate(endDate);

  const handleDayClick = (dt: Date) => {
    if (!s || (s && e)) { onChange(formatDate(dt), ''); }
    else {
      if (dt < s) { onChange(formatDate(dt), formatDate(s)); }
      else { onChange(formatDate(s), formatDate(dt)); setOpen(false); }
    }
  };

  const isInRange = (dt: Date): boolean => {
    if (!s) return false;
    const end = e || (hovered ? parseDate(hovered) : null);
    if (!end) return false;
    const lo = s < end ? s : end;
    const hi = s < end ? end : s;
    return dt > lo && dt < hi;
  };

  const isStart = (dt: Date) => s && dt.toDateString() === s.toDateString();
  const isEnd = (dt: Date) => e && dt.toDateString() === e.toDateString();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));

  const nights = s && e ? Math.round((e.getTime() - s.getTime()) / 86400000) : 0;
  const displayValue = s && e ? `${formatDate(s)}  →  ${formatDate(e)}` : s ? `${formatDate(s)}  →  selecione a volta` : 'Selecione o período da viagem';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(!open)}
        style={{ border: `1.5px solid ${open ? '#0D3B8C' : '#E2E8F0'}`, borderRadius: 12, padding: '13px 16px', cursor: 'pointer', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 15, color: s ? '#0F172A' : '#94A3B8' }}>
        <span>📅 {displayValue}</span>
        <span style={{ fontSize: 12, color: '#0D3B8C' }}>{open ? '▲' : '▼'}</span>
      </div>
      {nights > 0 && (
        <div style={{ fontSize: 13, color: '#1B6E3C', fontWeight: 700, marginTop: 8, background: '#F0FDF4', border: '1px solid #22C55E', borderRadius: 8, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          ✈️ <span>{nights} noite{nights > 1 ? 's' : ''} no Uruguai</span>
        </div>
      )}
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 500, background: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', border: '1px solid #E2E8F0', padding: 20, minWidth: 320 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button onClick={prevMonth} style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#0D3B8C' }}>{MONTHS[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 8 }}>
            {DAYS_LABEL.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', fontWeight: 600, padding: '4px 0' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {cells.map((dt, i) => {
              if (!dt) return <div key={i} />;
              const past = dt < today;
              const inRange = isInRange(dt);
              const start = isStart(dt);
              const end = isEnd(dt);
              const selected = start || end;
              return (
                <div key={i} onClick={() => !past && handleDayClick(dt)}
                  onMouseEnter={() => s && !e && setHovered(formatDate(dt))}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: selected ? 10 : inRange ? 0 : 10,
                    background: selected ? '#0D3B8C' : inRange ? '#DBEAFE' : 'transparent',
                    color: selected ? 'white' : past ? '#CBD5E1' : '#0F172A',
                    fontWeight: selected ? 700 : 400, fontSize: 14,
                    cursor: past ? 'not-allowed' : 'pointer',
                    borderTopLeftRadius: start || (!inRange && !end) ? 10 : 0,
                    borderBottomLeftRadius: start || (!inRange && !end) ? 10 : 0,
                    borderTopRightRadius: end || (!inRange && !start) ? 10 : 0,
                    borderBottomRightRadius: end || (!inRange && !start) ? 10 : 0,
                  }}>
                  {dt.getDate()}
                </div>
              );
            })}
          </div>
          {(!s || (s && !e)) && <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 14 }}>{!s ? 'Clique na data de chegada' : 'Agora clique na data de partida'}</p>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SINGLE DATE PICKER
// ═══════════════════════════════════════════════════════

function SingleDatePicker({ value, onChange, label, placeholder }: {
  value: string; onChange: (v: string) => void; label?: string; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const DAYS_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const getDays = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirst = (y: number, m: number) => new Date(y, m, 1).getDay();

  const formatDate = (dt: Date | null) => dt ? `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}` : '';
  const parseDate = (str: string) => { if (!str) return null; const [d, mo, y] = str.split('/'); const dt = new Date(Number(y), Number(mo) - 1, Number(d)); return isNaN(dt.getTime()) ? null : dt; };

  const selected = parseDate(value);
  const cells: (Date | null)[] = [];
  for (let i = 0; i < getFirst(viewYear, viewMonth); i++) cells.push(null);
  for (let d = 1; d <= getDays(viewYear, viewMonth); d++) cells.push(new Date(viewYear, viewMonth, d));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {label && <label style={{ fontSize: 14, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>{label}</label>}
      <div onClick={() => setOpen(!open)}
        style={{ border: `1.5px solid ${open ? '#0D3B8C' : '#E2E8F0'}`, borderRadius: 12, padding: '13px 16px', cursor: 'pointer', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 15, color: value ? '#0F172A' : '#94A3B8' }}>
        <span>📅 {value || placeholder || 'Selecione a data'}</span>
        <span style={{ fontSize: 12, color: '#0D3B8C' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 500, background: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', border: '1px solid #E2E8F0', padding: 20, minWidth: 300 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }} style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>‹</button>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#0D3B8C' }}>{MONTHS[viewMonth]} {viewYear}</span>
            <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }} style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 8 }}>
            {DAYS_LABEL.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', fontWeight: 600, padding: '4px 0' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {cells.map((dt, i) => {
              if (!dt) return <div key={i} />;
              const isSel = selected && dt.toDateString() === selected.toDateString();
              return <div key={i} onClick={() => { onChange(formatDate(dt)); setOpen(false); }}
                style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: isSel ? '#0D3B8C' : 'transparent', color: isSel ? 'white' : '#0F172A', fontWeight: isSel ? 700 : 400, fontSize: 14, cursor: 'pointer' }}>
                {dt.getDate()}
              </div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// INPUT COMPONENTS
// ═══════════════════════════════════════════════════════

function Input({ label, value, onChange, placeholder, type = 'text' }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      {label && <label style={{ fontSize: 14, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '12px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
        onFocus={e => (e.target.style.borderColor = '#0D3B8C')}
        onBlur={e => (e.target.style.borderColor = '#E2E8F0')} />
    </div>
  );
}

function NumberInput({ label, value, onChange, min = 0, max = 100 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
  return (
    <div>
      <label style={{ fontSize: 14, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 8 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => onChange(Math.max(min, value - 1))} style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#334155' }}>−</button>
        <span style={{ fontSize: 22, fontWeight: 800, minWidth: 40, textAlign: 'center', color: '#0D3B8C' }}>{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#0D3B8C', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white' }}>+</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CHAT PANEL
// ═══════════════════════════════════════════════════════

function ChatPanel({ messages, input, setInput, loading, onSend, endRef, onClose }: {
  messages: { role: string; content: string }[];
  input: string; setInput: (v: string) => void;
  loading: boolean; onSend: (msg: string) => void;
  endRef: React.RefObject<HTMLDivElement | null>; onClose: () => void;
}) {
  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(input); } };
  return (
    <div style={{ position: 'fixed', bottom: 90, right: 20, width: 340, height: 500, background: 'white', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', zIndex: 1000, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
      <div style={{ background: 'linear-gradient(135deg, #0D3B8C, #1E5CB5)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🧑‍💼</div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>Rodrigo</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Consultor BNU • Online</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: m.role === 'user' ? 'linear-gradient(135deg, #0D3B8C, #1E5CB5)' : '#F1F5F9', color: m.role === 'user' ? 'white' : '#1E293B', fontSize: 13, lineHeight: 1.5 }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={{ display: 'flex', gap: 6, padding: '10px 14px', background: '#F1F5F9', borderRadius: '18px 18px 18px 4px', width: 'fit-content' }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#94A3B8', animation: 'bounce 1s infinite', animationDelay: `${i * 0.2}s` }} />)}
        </div>}
        <div ref={endRef} />
      </div>
      <div style={{ padding: '12px 16px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Pergunte sobre o Uruguai..."
          style={{ flex: 1, border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '10px 12px', fontSize: 13, resize: 'none', outline: 'none', fontFamily: 'inherit', maxHeight: 80, lineHeight: 1.4 }} rows={1} />
        <button onClick={() => onSend(input)} disabled={!input.trim() || loading}
          style={{ width: 40, height: 40, borderRadius: '50%', background: input.trim() ? 'linear-gradient(135deg, #0D3B8C, #1E5CB5)' : '#E2E8F0', border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', color: 'white', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          ➤
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// STEP CONTENT
// ═══════════════════════════════════════════════════════

function StepContent({ stepId, answers, setAnswers, cities, tours, hotelStyles, travelProfiles, budgetRanges }: {
  stepId: number;
  answers: WizardAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<WizardAnswers>>;
  cities: City[];
  tours: Tour[];
  hotelStyles: HotelStyle[];
  travelProfiles: TravelProfile[];
  budgetRanges: BudgetRange[];
}) {
  const update = (key: string, val: unknown) => setAnswers(prev => ({ ...prev, [key]: val }));

  if (stepId === 1) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Input label="Nome completo *" value={answers.nome || ''} onChange={v => update('nome', v)} placeholder="Ex: Ana Lima" />
      <Input label="WhatsApp *" value={answers.whatsapp || ''} onChange={v => update('whatsapp', v)} placeholder="Ex: (11) 99999-9999" />
      <Input label="E-mail *" value={answers.email || ''} onChange={v => update('email', v)} placeholder="seu@email.com" type="email" />
      <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #F0FDF4)', border: '1.5px solid #BFDBFE', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, animation: 'pulseHint 2.5s ease-in-out infinite' }}>
        <div style={{ fontSize: 22, flexShrink: 0 }}>💬</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#0D3B8C', marginBottom: 2 }}>Dúvidas? Fale com o Rodrigo!</div>
          <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>Clique no botão de chat no canto da tela para tirar qualquer dúvida na hora.</div>
        </div>
      </div>
      <style>{`
        @keyframes pulseHint { 0%,100%{box-shadow:0 0 0 0 rgba(13,59,140,0.15)} 50%{box-shadow:0 0 0 8px rgba(13,59,140,0)} }
      `}</style>
    </div>
  );

  if (stepId === 2) return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {travelProfiles.map(p => (
        <div key={p.id} onClick={() => update('perfil', p.id)}
          style={{ border: `2px solid ${answers.perfil === p.id ? '#0D3B8C' : '#E2E8F0'}`, borderRadius: 14, padding: '16px 12px', cursor: 'pointer', background: answers.perfil === p.id ? '#EFF6FF' : 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}>
          <span style={{ fontSize: 28 }}>{p.emoji}</span>
          <span style={{ fontSize: 14, fontWeight: 600, textAlign: 'center' }}>{p.label}</span>
        </div>
      ))}
    </div>
  );

  if (stepId === 3) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <NumberInput label="Adultos *" value={answers.adultos || 1} onChange={v => update('adultos', v)} min={1} max={50} />
        <NumberInput label="Crianças (até 11 anos)" value={answers.criancas || 0} onChange={v => update('criancas', v)} min={0} max={20} />
      </div>
      {(answers.criancas || 0) > 0 && (
        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 12, padding: 12, fontSize: 13 }}>
          Crianças até 12 anos não pagam ingresso na Casapueblo. Há passeios especialmente indicados para famílias.
        </div>
      )}
    </div>
  );

  if (stepId === 4) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
        {['Tenho datas definidas', 'Ainda nao definidas'].map(opt => (
          <button key={opt} onClick={() => { update('datas_definidas', opt === 'Tenho datas definidas'); if (opt !== 'Tenho datas definidas' && !answers.dias_total) update('dias_total', 5); }}
            style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: `2px solid ${answers.datas_definidas === (opt === 'Tenho datas definidas') ? '#0D3B8C' : '#E2E8F0'}`, background: answers.datas_definidas === (opt === 'Tenho datas definidas') ? '#EFF6FF' : 'white', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            {opt === 'Tenho datas definidas' ? 'Tenho as datas' : 'Ainda não sei'}
          </button>
        ))}
      </div>
      {answers.datas_definidas === true && (
        <DateRangePicker startDate={answers.data_ida || ''} endDate={answers.data_volta || ''}
          onChange={(start, end) => { update('data_ida', start); update('data_volta', end); }} />
      )}
      {answers.datas_definidas === false && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <NumberInput label="Quantos dias pretende ficar?" value={answers.dias_total || 5} onChange={v => update('dias_total', v)} min={1} max={30} />
          {(answers.dias_total || 5) > 1 && (
            <div style={{ background: '#F0FDF4', border: '1px solid #22C55E', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
              ✅ {(answers.dias_total || 5) - 1} noite{(answers.dias_total || 5) - 1 > 1 ? 's' : ''} no Uruguai
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (stepId === 5) {
    const cidades = (answers.cidades || {}) as Record<string, number | string>;
    const toggleCidade = (id: string) => {
      const novo = { ...cidades };
      if (novo[id] !== undefined) { delete novo[id]; } else { novo[id] = id === 'outro' ? '' : 2; }
      update('cidades', novo);
    };

    const parseDate = (str: string) => {
      if (!str) return null;
      const [d, m, y] = str.split('/');
      return new Date(Number(y), Number(m) - 1, Number(d));
    };
    const tripStart = parseDate(answers.data_ida || '');
    const tripEnd = parseDate(answers.data_volta || '');
    const totalTripNights = tripStart && tripEnd ? Math.round((tripEnd.getTime() - tripStart.getTime()) / 86400000) : ((answers.dias_total || 0) > 1 ? (answers.dias_total || 0) - 1 : null);
    const usedNights = Object.values(cidades).reduce((sum: number, v) => sum + (Number(v) || 0), 0);
    const remainingNights = totalTripNights !== null ? totalTripNights - usedNights : null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {totalTripNights !== null && (
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14 }}>
            <span>Total da viagem: <strong>{totalTripNights} noites</strong></span>
            <span style={{ color: remainingNights === 0 ? '#1B6E3C' : (remainingNights !== null && remainingNights < 0) ? '#DC2626' : '#0D3B8C', fontWeight: 700 }}>
              {remainingNights !== null && remainingNights >= 0 ? `${remainingNights} noite${remainingNights !== 1 ? 's' : ''} disponível${remainingNights !== 1 ? 'is' : ''}` : remainingNights !== null ? `${Math.abs(remainingNights)} noite${Math.abs(remainingNights) !== 1 ? 's' : ''} a mais` : ''}
            </span>
          </div>
        )}
        {remainingNights !== null && remainingNights < 0 && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: '#DC2626' }}>
            Você selecionou mais noites do que o total da viagem. Ajuste os valores abaixo.
          </div>
        )}
        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#92400E', lineHeight: 1.6, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
          <span>Lembrete: Se hospedar em mais de uma cidade em um período curto de viagem pode ser cansativo, além de aumentar o orçamento da viagem devido aos transfers para se locomover entre cidades.</span>
        </div>
        <p style={{ fontSize: 13, color: '#64748B' }}>Selecione as cidades e informe quantas noites em cada uma:</p>
        {cities.map(c => (
          <div key={c.id} style={{ border: `2px solid ${cidades[c.id] !== undefined ? '#0D3B8C' : '#E2E8F0'}`, borderRadius: 12, padding: '12px 16px', cursor: 'pointer', background: cidades[c.id] !== undefined ? '#EFF6FF' : 'white', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => toggleCidade(c.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{c.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{c.nome}</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{c.description}</div>
                </div>
              </div>
              <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${cidades[c.id] !== undefined ? '#0D3B8C' : '#CBD5E1'}`, background: cidades[c.id] !== undefined ? '#0D3B8C' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {cidades[c.id] !== undefined && <span style={{ color: 'white', fontSize: 14 }}>✓</span>}
              </div>
            </div>
            {cidades[c.id] !== undefined && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E2E8F0' }} onClick={e => e.stopPropagation()}>
                {c.id === 'outro'
                  ? <Input label="Qual cidade?" value={String(cidades[c.id] || '')} onChange={v => update('cidades', { ...cidades, outro: v })} placeholder="Nome da cidade..." />
                  : <NumberInput label="Quantas noites?" value={Number(cidades[c.id]) || 2}
                      onChange={v => {
                        const maxAllowed = totalTripNights !== null ? totalTripNights - (usedNights - (Number(cidades[c.id]) || 0)) : 99;
                        update('cidades', { ...cidades, [c.id]: Math.min(v, Math.max(1, maxAllowed)) });
                      }}
                      min={1} max={totalTripNights || 99} />
                }
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (stepId === 6) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {hotelStyles.map(h => (
        <div key={h.id} onClick={() => update('hotel_estrelas', h.id)}
          style={{ border: `2px solid ${answers.hotel_estrelas === h.id ? '#0D3B8C' : '#E2E8F0'}`, borderRadius: 16, padding: '16px 20px', cursor: 'pointer', background: answers.hotel_estrelas === h.id ? '#EFF6FF' : 'white', display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s' }}>
          <div style={{ fontSize: 30 }}>{h.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{h.stars} {h.label}</div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{h.description}</div>
          </div>
          {answers.hotel_estrelas === h.id && <div style={{ color: '#0D3B8C', fontSize: 20 }}>✓</div>}
        </div>
      ))}
    </div>
  );

  if (stepId === 7) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {['Já tenho hotel em mente', 'Quero sugestões de hotéis'].map(opt => (
          <button key={opt} onClick={() => update('hotel_opcao', opt)}
            style={{ flex: 1, padding: '14px 12px', borderRadius: 12, border: `2px solid ${answers.hotel_opcao === opt ? '#0D3B8C' : '#E2E8F0'}`, background: answers.hotel_opcao === opt ? '#EFF6FF' : 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13, lineHeight: 1.4 }}>
            {opt === 'Já tenho hotel em mente' ? 'Já tenho hotel em mente' : 'Quero sugestões de hotéis'}
          </button>
        ))}
      </div>
      {answers.hotel_opcao === 'Já tenho hotel em mente' && (
        <Input label="Qual hotel(is)?" value={answers.hotel_nome || ''} onChange={v => update('hotel_nome', v)} placeholder="Ex: Cottage Hotel, Sofitel..." />
      )}
    </div>
  );

  if (stepId === 8) return (
    <div>
      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>Selecione os passeios de interesse (pode marcar varios):</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {tours.filter(t => t.ativo).map(p => {
          const sel = (answers.passeios || []).includes(p.id);
          return (
            <div key={p.id} onClick={() => {
              const cur = answers.passeios || [];
              update('passeios', sel ? cur.filter(x => x !== p.id) : [...cur, p.id]);
            }}
              style={{ border: `2px solid ${sel ? '#0D3B8C' : '#E2E8F0'}`, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}>
              <div style={{ height: 110, overflow: 'hidden', position: 'relative', background: '#E2E8F0' }}>
                <TourImage id={p.id} nome={p.nome} tours={tours} />
                {sel && <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,59,140,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: 'white', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0D3B8C', fontWeight: 800, fontSize: 16 }}>✓</div>
                </div>}
              </div>
              <div style={{ padding: '8px 10px', background: sel ? '#EFF6FF' : 'white' }}>
                <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.3, color: '#0F172A' }}>{p.emoji} {p.nome}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{p.description}</div>
                <div style={{ fontSize: 13, color: '#1B6E3C', fontWeight: 700, marginTop: 4 }}>R$ {p.valor_por_pessoa}/pessoa</div>

              </div>
            </div>
          );
        })}
      </div>
      {(answers.passeios || []).length > 2 && (
        <div style={{ background: '#F0FDF4', border: '1px solid #22C55E', borderRadius: 10, padding: 10, marginTop: 12, fontSize: 13, color: '#166534' }}>
          Com {(answers.passeios || []).length} passeios, você pode ter direito a desconto especial!
        </div>
      )}
    </div>
  );

  if (stepId === 9) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {['Sim, tenho algo para comemorar!', 'Não, é uma viagem normal'].map(opt => (
          <button key={opt} onClick={() => update('ocasiao_especial', opt)}
            style={{ flex: 1, padding: '14px 12px', borderRadius: 12, border: `2px solid ${answers.ocasiao_especial === opt ? '#0D3B8C' : '#E2E8F0'}`, background: answers.ocasiao_especial === opt ? '#EFF6FF' : 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13, lineHeight: 1.4 }}>
            {opt.startsWith('Sim') ? 'Sim, vou comemorar!' : 'Não, viagem normal'}
          </button>
        ))}
      </div>
      {answers.ocasiao_especial?.startsWith('Sim') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Qual é a ocasião especial?" value={answers.ocasiao_detalhe || ''} onChange={v => update('ocasiao_detalhe', v)} placeholder="Ex: aniversário de 50 anos, pedido de casamento, lua de mel..." />
          <SingleDatePicker label="Data da ocasiao" value={answers.ocasiao_data || ''} onChange={v => update('ocasiao_data', v)} placeholder="Selecione a data" />
        </div>
      )}
    </div>
  );

  if (stepId === 10) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 4 }}>Uma estimativa nos ajuda a montar a proposta ideal para você.</p>
      {budgetRanges.map(o => (
        <button key={o.id} onClick={() => update('orcamento', o.label)}
          style={{ padding: '14px 18px', borderRadius: 12, border: `2px solid ${answers.orcamento === o.label ? '#0D3B8C' : '#E2E8F0'}`, background: answers.orcamento === o.label ? '#EFF6FF' : 'white', cursor: 'pointer', fontWeight: answers.orcamento === o.label ? 700 : 500, fontSize: 14, textAlign: 'left', color: answers.orcamento === o.label ? '#0D3B8C' : '#334155' }}>
          {answers.orcamento === o.label ? '✓ ' : ''}{o.label}
        </button>
      ))}
    </div>
  );

  if (stepId === 11) return (
    <div>
      <label style={{ fontSize: 14, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 8 }}>Algum detalhe importante sobre a sua viagem?</label>
      <textarea value={answers.extras || ''} onChange={e => update('extras', e.target.value)}
        placeholder="Ex: tenho restrição alimentar, prefiro passeios tranquilos, viajamos com pessoa com mobilidade reduzida, quero visitar vinícolas..."
        style={{ width: '100%', minHeight: 120, border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', fontSize: 14, lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
    </div>
  );

  return null;
}

// ═══════════════════════════════════════════════════════
// STEP CONFIG
// ═══════════════════════════════════════════════════════

const STEP_CONFIG = [
  { title: 'Vamos começar?', sub: 'Nos informe quem é você' },
  { title: 'Perfil da viagem', sub: 'Como será o grupo?' },
  { title: 'Tamanho do grupo', sub: 'Quantos vão viajar?' },
  { title: 'Quando viaja?', sub: 'Datas ou duração planejada' },
  { title: 'Cidades do roteiro', sub: 'Quais cidades incluir?' },
  { title: 'Estilo de hospedagem', sub: 'Nível de conforto desejado' },
  { title: 'Preferência de hotel', sub: 'Já definido ou quer sugestões?' },
  { title: 'Passeios e Experiências', sub: 'O que você quer fazer no Uruguai?' },
  { title: 'Vai comemorar uma data especial?', sub: 'Informe qual é a ocasião e a data' },
  { title: 'Orçamento', sub: 'Faixa de investimento' },
  { title: 'Informações adicionais', sub: 'Algum detalhe importante?' },
];

// ═══════════════════════════════════════════════════════
// MAIN WIZARD PAGE
// ═══════════════════════════════════════════════════════

export default function WizardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<WizardAnswers>({ adultos: 1, criancas: 0, passeios: [] });
  const [loadingData, setLoadingData] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [generating, setGenerating] = useState(false);

  // Catalog data from Supabase
  const [cities, setCities] = useState<City[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [hotelStyles, setHotelStyles] = useState<HotelStyle[]>([]);
  const [travelProfiles, setTravelProfiles] = useState<TravelProfile[]>([]);
  const [budgetRanges, setBudgetRanges] = useState<BudgetRange[]>([]);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([
    { role: 'assistant', content: 'Olá! Sou o Rodrigo, consultor da Brasileiros no Uruguai.\n\nPode me perguntar qualquer coisa sobre a viagem enquanto preenche o formulário!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const totalSteps = 11;

  // Load catalog data and existing answers
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        const [citiesRes, toursRes, hotelRes, profilesRes, budgetRes] = await Promise.all([
          supabase.from('cities').select('*').order('sort_order'),
          supabase.from('tours').select('*').order('sort_order'),
          supabase.from('hotel_styles').select('*').order('sort_order'),
          supabase.from('travel_profiles').select('*').order('sort_order'),
          supabase.from('budget_ranges').select('*').order('sort_order'),
        ]);

        if (citiesRes.data) setCities(citiesRes.data);
        if (toursRes.data) setTours(toursRes.data);
        if (hotelRes.data) setHotelStyles(hotelRes.data);
        if (profilesRes.data) setTravelProfiles(profilesRes.data);
        if (budgetRes.data) setBudgetRanges(budgetRes.data);

        // Load user profile to pre-fill name/whatsapp/email
        let profileNome = '';
        let profileWhatsapp = '';
        let profileEmail = '';
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('nome, whatsapp, email')
            .eq('id', user.id)
            .single();
          if (profileData) {
            profileNome = profileData.nome || '';
            profileWhatsapp = profileData.whatsapp || '';
            profileEmail = profileData.email || user.email || '';
          }
        }

        // Load existing answers for resume
        if (id) {
          const { data: answersData } = await supabase
            .from('itinerary_answers')
            .select('*')
            .eq('itinerary_id', id)
            .single();

          if (answersData) {
            const loaded: WizardAnswers = {
              nome: answersData.nome || profileNome,
              whatsapp: answersData.whatsapp || profileWhatsapp,
              email: answersData.email || profileEmail,
              perfil: answersData.perfil || '',
              adultos: answersData.adultos || 1,
              criancas: answersData.criancas || 0,
              datas_definidas: answersData.datas_definidas ?? undefined,
              data_ida: answersData.data_ida || '',
              data_volta: answersData.data_volta || '',
              dias_total: answersData.dias_total ?? undefined,
              cidades: answersData.cidades || {},
              hotel_estrelas: answersData.hotel_estrelas || '',
              hotel_opcao: answersData.hotel_opcao || '',
              hotel_nome: answersData.hotel_nome || '',
              passeios: answersData.passeios || [],
              ocasiao_especial: answersData.ocasiao_especial || '',
              ocasiao_detalhe: answersData.ocasiao_detalhe || '',
              ocasiao_data: answersData.ocasiao_data || '',
              orcamento: answersData.orcamento || '',
              extras: answersData.extras || '',
            };
            setAnswers(loaded);
            setStep(answersData.current_step || 0);
          } else {
            // Fresh itinerary — pre-fill from profile
            setAnswers(prev => ({
              ...prev,
              nome: profileNome,
              whatsapp: profileWhatsapp,
              email: profileEmail,
            }));
          }

          // Load chat messages
          const { data: chatData } = await supabase
            .from('chat_messages')
            .select('role, content')
            .eq('itinerary_id', id)
            .order('created_at');

          if (chatData && chatData.length > 0) {
            setChatMessages([
              { role: 'assistant', content: 'Olá! Sou o Rodrigo, consultor da Brasileiros no Uruguai.\n\nPode me perguntar qualquer coisa sobre a viagem enquanto preenche o formulário!' },
              ...chatData,
            ]);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      }
      setLoadingData(false);
    };
    loadData();
  }, [id, user]);

  // Save answers to DB
  const saveAnswers = useCallback(async (currentStep?: number) => {
    if (!id) return;
    setSaveStatus('saving');
    try {
      await supabase
        .from('itinerary_answers')
        .update({
          nome: answers.nome || '',
          whatsapp: answers.whatsapp || '',
          email: answers.email || '',
          perfil: answers.perfil || '',
          adultos: answers.adultos || 1,
          criancas: answers.criancas || 0,
          datas_definidas: answers.datas_definidas ?? null,
          data_ida: answers.data_ida || '',
          data_volta: answers.data_volta || '',
          dias_total: answers.dias_total ?? null,
          cidades: answers.cidades || {},
          hotel_estrelas: answers.hotel_estrelas || '',
          hotel_opcao: answers.hotel_opcao || '',
          hotel_nome: answers.hotel_nome || '',
          passeios: answers.passeios || [],
          ocasiao_especial: answers.ocasiao_especial || '',
          ocasiao_detalhe: answers.ocasiao_detalhe || '',
          ocasiao_data: answers.ocasiao_data || '',
          orcamento: answers.orcamento || '',
          extras: answers.extras || '',
          current_step: currentStep ?? step,
        })
        .eq('itinerary_id', id);

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setSaveStatus('idle');
    }
  }, [id, answers, step]);

  // Debounced auto-save (2s)
  const debouncedSave = useDebounce(saveAnswers, 2000);

  // Auto-save on answers change
  useEffect(() => {
    if (!loadingData && id) {
      debouncedSave();
    }
  }, [answers, debouncedSave, loadingData, id]);

  // Save on step change
  const goToStep = (newStep: number) => {
    setStep(newStep);
    saveAnswers(newStep);
  };

  // Chat via Edge Function
  const sendChat = async (msg: string) => {
    if (!msg.trim() || chatLoading) return;
    const userMsg = { role: 'user', content: msg };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: {
          itinerary_id: id,
          message: msg,
        },
      });

      const assistantContent = error
        ? 'Ops! Problema momentaneo. Tente novamente!'
        : data?.reply || 'Não consegui responder agora. Tente novamente!';

      setChatMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (err) {
      console.error('[CHAT DEBUG] catch error:', err);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Ops! Problema momentaneo. Tente novamente!' }]);
    }
    setChatLoading(false);
  };

  // Generate itinerary via Edge Function
  const handleGenerate = async () => {
    if (!id) return;
    setGenerating(true);
    await saveAnswers(step);

    try {
      const { data: { session: genSession } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('generate-itinerary', {
        headers: { Authorization: `Bearer ${genSession?.access_token}` },
        body: { itinerary_id: id },
      });

      if (error) throw error;

      // Update itinerary status
      await supabase
        .from('itineraries')
        .update({
          status: 'generated',
          generated_result: data?.result || '',
        })
        .eq('id', id);

      navigate(`/result/${id}`);
    } catch (err) {
      console.error('Erro ao gerar roteiro:', err);
      alert('Erro ao gerar roteiro. Tente novamente.');
      setGenerating(false);
    }
  };

  const canAdvance = () => {
    if (step === 0) return !!(answers.nome?.trim() && answers.whatsapp?.trim() && answers.email?.trim());
    if (step === 1) return !!answers.perfil;
    if (step === 2) return (answers.adultos || 0) >= 1;
    if (step === 3) return answers.datas_definidas !== undefined;
    if (step === 4) return Object.keys(answers.cidades || {}).length > 0;
    if (step === 5) return !!answers.hotel_estrelas;
    if (step === 6) return !!answers.hotel_opcao;
    return true;
  };

  if (loadingData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16, animation: 'bounce 1.2s ease-in-out infinite' }}>🗺️</div>
          <div style={{ color: '#0D3B8C', fontWeight: 700, fontSize: 16 }}>Carregando seu roteiro...</div>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 56, marginBottom: 16, animation: 'bounce 1.2s ease-in-out infinite' }}>🗺️</div>
          <h2 style={{ color: '#0D3B8C', marginBottom: 10, fontSize: 22 }}>Montando seu roteiro perfeito...</h2>
          <p style={{ color: '#64748B', fontSize: 15, lineHeight: 1.7 }}>Estamos analisando suas preferências,<br />calculando o orçamento e preparando tudo com carinho!</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: '#0D3B8C', animation: 'bounce 1s infinite', animationDelay: `${i * 0.3}s` }} />)}
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
            {['🏨 Hospedagem', '🎫 Passeios', '🚗 Transfers', '💰 Orçamento'].map((item, i) => (
              <div key={i} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 100, padding: '6px 14px', fontSize: 13, color: '#64748B', animation: `fadeIn 0.5s ease ${i * 0.3}s both` }}>{item}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { title, sub } = STEP_CONFIG[step];
  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BNULogo size={36} />
          <div>
            <div style={{ fontWeight: 900, fontSize: 14, color: '#0D3B8C' }}>Criador de Roteiro</div>
            <div style={{ fontSize: 11, color: '#94A3B8', letterSpacing: 0.5 }}>Brasileiros no Uruguai</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saveStatus === 'saving' && <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>Salvando...</span>}
          {saveStatus === 'saved' && <span style={{ fontSize: 12, color: '#1B6E3C', fontWeight: 600 }}>✓ Salvo</span>}
          <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Etapa {step + 1} de {totalSteps}</div>
        </div>
      </div>
      <div style={{ height: 4, background: '#E2E8F0' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #0D3B8C, #1B6E3C)', transition: 'width 0.4s ease', borderRadius: '0 2px 2px 0' }} />
      </div>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px 120px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
            {[...Array(totalSteps)].map((_, i) => (
              <div key={i} style={{ flex: 1, minWidth: 16, height: 4, borderRadius: 2, background: i <= step ? '#0D3B8C' : '#E2E8F0', transition: 'background 0.3s' }} />
            ))}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '16px 0 6px' }}>{title}</h2>
          <p style={{ fontSize: 15, color: '#64748B', margin: 0 }}>{sub}</p>
        </div>
        <StepContent
          stepId={step + 1}
          answers={answers}
          setAnswers={setAnswers}
          cities={cities}
          tours={tours}
          hotelStyles={hotelStyles}
          travelProfiles={travelProfiles}
          budgetRanges={budgetRanges}
        />
      </div>
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1px solid #E2E8F0', padding: '16px 24px', display: 'flex', gap: 12, zIndex: 50 }}>
        {step > 0 && <button onClick={() => goToStep(step - 1)} style={{ flex: 1, maxWidth: 120, padding: '14px', border: '2px solid #E2E8F0', borderRadius: 12, background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 15, color: '#334155' }}>Voltar</button>}
        {step < totalSteps - 1
          ? <button onClick={() => canAdvance() && goToStep(step + 1)} disabled={!canAdvance()}
              style={{ flex: 1, padding: '14px', border: 'none', borderRadius: 12, background: canAdvance() ? 'linear-gradient(135deg, #0D3B8C, #1E5CB5)' : '#E2E8F0', cursor: canAdvance() ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 15, color: canAdvance() ? 'white' : '#94A3B8', transition: 'all 0.2s' }}>
              Próximo
            </button>
          : <button onClick={handleGenerate} style={{ flex: 1, padding: '14px', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg, #1B6E3C, #22C55E)', cursor: 'pointer', fontWeight: 800, fontSize: 16, color: 'white' }}>
              Gerar Meu Roteiro!
            </button>
        }
      </div>
      <button onClick={() => setChatOpen(!chatOpen)}
        style={{ position: 'fixed', bottom: 90, right: 20, width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #0D3B8C, #1E5CB5)', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(13,59,140,0.4)', fontSize: 24, zIndex: 999, display: chatOpen ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', animation: step === 0 ? 'chatPulse 1.8s ease-in-out infinite' : 'none' }}>
        💬
      </button>
      <style>{`@keyframes chatPulse { 0%,100%{box-shadow:0 4px 20px rgba(13,59,140,0.4)} 50%{box-shadow:0 4px 32px rgba(13,59,140,0.9), 0 0 0 10px rgba(13,59,140,0.15)} }`}</style>
      {chatOpen && <ChatPanel messages={chatMessages} input={chatInput} setInput={setChatInput} loading={chatLoading} onSend={sendChat} endRef={chatEndRef} onClose={() => setChatOpen(false)} />}
    </div>
  );
}
