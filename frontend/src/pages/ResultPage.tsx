import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { WizardAnswers, City, TravelProfile } from '../types/database';
import faviconSrc from '../assets/favicon.png';

const FAVICON_SRC = faviconSrc;

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function boldify(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function MarkdownText({ text, noBold }: { text: string; noBold?: boolean }) {
  if (!text) return null;
  const process = (t: string) => noBold ? t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1') : boldify(t);
  const lines = text.split('\n');
  return (
    <div style={{ lineHeight: 1.75 }}>
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h3 key={i} style={{ color: '#0D3B8C', marginTop: 20, marginBottom: 6, fontSize: 16, fontWeight: 700 }}>{line.slice(4)}</h3>;
        if (line.startsWith('## ')) return <h2 key={i} style={{ color: '#0D3B8C', marginTop: 24, marginBottom: 8, fontSize: 18, fontWeight: 800, borderBottom: '2px solid #F59E0B', paddingBottom: 4 }}>{line.slice(3)}</h2>;
        if (line.startsWith('# ')) return <h1 key={i} style={{ color: '#0D3B8C', marginTop: 24, marginBottom: 10, fontSize: 22, fontWeight: 900 }}>{line.slice(2)}</h1>;
        if (line.startsWith('- ') || line.startsWith('* '))
          return <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}><span style={{ color: '#F59E0B', flexShrink: 0 }}>•</span><span dangerouslySetInnerHTML={{ __html: process(line.slice(2)) }} /></div>;
        if (/^\d+\. /.test(line)) {
          const num = line.match(/^(\d+)\. /)?.[1] || '';
          return <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}><span style={{ color: '#0D3B8C', fontWeight: 700, flexShrink: 0, minWidth: 20 }}>{num}.</span><span dangerouslySetInnerHTML={{ __html: process(line.replace(/^\d+\. /, '')) }} /></div>;
        }
        if (line.trim() === '') return <br key={i} />;
        return <p key={i} style={{ margin: '4px 0' }} dangerouslySetInnerHTML={{ __html: process(line) }} />;
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TRIP TIMELINE
// ═══════════════════════════════════════════════════════

function TripTimeline({ answers, cities }: { answers: WizardAnswers; cities: City[] }) {
  const cidades = answers.cidades || {};
  const cidadesList = Object.entries(cidades).map(([k, v]) => ({
    id: k,
    nome: cities.find(c => c.id === k)?.nome || k,
    emoji: cities.find(c => c.id === k)?.emoji || '📍',
    noites: Number(v),
  })).filter(c => c.noites > 0);

  const parseDate = (str: string) => {
    if (!str) return null;
    const [d, m, y] = str.split('/');
    return new Date(Number(y), Number(m) - 1, Number(d));
  };
  const start = parseDate(answers.data_ida || '');
  const end = parseDate(answers.data_volta || '');
  const addDays = (dt: Date, n: number) => { const d = new Date(dt); d.setDate(d.getDate() + n); return d; };
  const fmt = (dt: Date | null) => dt ? dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '?';

  if (cidadesList.length === 0 && !start) return null;

  const segments: {
    type: string; label: string; emoji: string; color: string;
    noites?: number; dateFrom?: string; dateTo?: string; date?: string;
  }[] = [];
  let cursor = start;

  if (start) {
    segments.push({ type: 'event', label: 'Chegada', date: fmt(start), emoji: '✈️', color: '#0D3B8C' });
    cidadesList.forEach((c) => {
      const partida = cursor ? addDays(cursor, c.noites) : null;
      segments.push({ type: 'city', label: c.nome, emoji: c.emoji, noites: c.noites, dateFrom: fmt(cursor), dateTo: fmt(partida), color: '#1B6E3C' });
      cursor = partida;
    });
    segments.push({ type: 'event', label: 'Partida', date: end ? fmt(end) : fmt(cursor), emoji: '🛫', color: '#F59E0B' });
  } else {
    cidadesList.forEach((c) => segments.push({ type: 'city', label: c.nome, emoji: c.emoji, noites: c.noites, dateFrom: undefined, dateTo: undefined, color: '#1B6E3C' }));
  }

  const totalNoites = cidadesList.reduce((s, c) => s + c.noites, 0);

  return (
    <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, padding: '24px 20px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0D3B8C', margin: 0 }}>Visao Geral da Viagem</h2>
        {totalNoites > 0 && <span style={{ fontSize: 13, fontWeight: 500, color: '#64748B', background: '#F1F5F9', padding: '3px 12px', borderRadius: 20 }}>{totalNoites} noites</span>}
      </div>
      <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: Math.max(400, segments.length * 110) }}>
          {segments.map((seg, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: seg.type === 'city' ? Math.max(1, seg.noites || 1) : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: seg.type === 'event' ? 64 : 80 }}>
                <div style={{ width: 48, height: 48, borderRadius: seg.type === 'event' ? '50%' : 14, background: seg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  {seg.emoji}
                </div>
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 11, color: '#0F172A', whiteSpace: 'nowrap' }}>{seg.label}</div>
                  {seg.type === 'city' && seg.noites && <div style={{ fontSize: 11, color: '#64748B' }}>{seg.noites} noite{seg.noites > 1 ? 's' : ''}</div>}
                  {seg.type === 'city' && seg.dateFrom && <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{seg.dateFrom}</div>}
                  {seg.type === 'event' && seg.date && <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{seg.date}</div>}
                </div>
              </div>
              {i < segments.length - 1 && (
                <div style={{ flex: 1, height: 3, background: `linear-gradient(90deg, ${seg.color}, ${segments[i + 1].color})`, margin: '0 4px', marginTop: -28, borderRadius: 2, minWidth: 16, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, background: 'white', border: '2px solid #CBD5E1', borderRadius: '50%' }} />
                </div>
              )}
            </div>
          ))}
        </div>
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
// RESULT PAGE
// ═══════════════════════════════════════════════════════

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useAuth();

  const [result, setResult] = useState<string | null>(null);
  const [answers, setAnswers] = useState<WizardAnswers>({});
  const [loading, setLoading] = useState(true);
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState('');

  // Catalog data
  const [cities, setCities] = useState<City[]>([]);
  const [travelProfiles, setTravelProfiles] = useState<TravelProfile[]>([]);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([
    { role: 'assistant', content: 'Ola! Sou o Rodrigo, consultor da Brasileiros no Uruguai.\n\nPode me perguntar qualquer coisa sobre a viagem!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [itineraryRes, answersRes, citiesRes, profilesRes, chatRes] = await Promise.all([
          supabase.from('itineraries').select('*').eq('id', id).single(),
          supabase.from('itinerary_answers').select('*').eq('itinerary_id', id).single(),
          supabase.from('cities').select('*').order('sort_order'),
          supabase.from('travel_profiles').select('*').order('sort_order'),
          supabase.from('chat_messages').select('role, content').eq('itinerary_id', id).order('created_at'),
        ]);

        if (itineraryRes.data) {
          setResult(itineraryRes.data.generated_result || null);
        }
        if (answersRes.data) {
          setAnswers({
            nome: answersRes.data.nome,
            whatsapp: answersRes.data.whatsapp,
            email: answersRes.data.email,
            perfil: answersRes.data.perfil,
            adultos: answersRes.data.adultos,
            criancas: answersRes.data.criancas,
            datas_definidas: answersRes.data.datas_definidas,
            data_ida: answersRes.data.data_ida,
            data_volta: answersRes.data.data_volta,
            dias_total: answersRes.data.dias_total,
            cidades: answersRes.data.cidades,
            hotel_estrelas: answersRes.data.hotel_estrelas,
            hotel_opcao: answersRes.data.hotel_opcao,
            hotel_nome: answersRes.data.hotel_nome,
            passeios: answersRes.data.passeios,
            ocasiao_especial: answersRes.data.ocasiao_especial,
            ocasiao_detalhe: answersRes.data.ocasiao_detalhe,
            ocasiao_data: answersRes.data.ocasiao_data,
            orcamento: answersRes.data.orcamento,
            extras: answersRes.data.extras,
          });
        }
        if (citiesRes.data) setCities(citiesRes.data);
        if (profilesRes.data) setTravelProfiles(profilesRes.data);
        if (chatRes.data && chatRes.data.length > 0) {
          setChatMessages([
            { role: 'assistant', content: 'Ola! Sou o Rodrigo, consultor da Brasileiros no Uruguai.\n\nPode me perguntar qualquer coisa sobre a viagem!' },
            ...chatRes.data,
          ]);
        }
      } catch (err) {
        console.error('Erro ao carregar resultado:', err);
      }
      setLoading(false);
    };
    loadData();
  }, [id]);

  // Send itinerary email to client + copy to BNU
  const sendItineraryEmail = async (clientEmail: string, clientName: string, clientPhone: string, itineraryHtml: string) => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const endpoint = `${SUPABASE_URL}/functions/v1/send-email`;

    const baseHtml = (extra: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0D3B8C, #1B6E3C); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">Brasileiros no Uruguai</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Seu roteiro personalizado</p>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
          ${extra}
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <div style="color: #1E293B; font-size: 14px; line-height: 1.8; white-space: pre-line;">${itineraryHtml}</div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #64748b; font-size: 13px; font-style: italic;">Este é um pré-roteiro orientativo. Valores finais serão confirmados pela consultora.</p>
        </div>
        <div style="background: #F8FAFC; padding: 16px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">Brasileiros no Uruguai - contato@brasileirosnouruguai.com.br</p>
        </div>
      </div>
    `;

    const clientContent = `
      <p style="color: #334155; font-size: 16px;">Olá, ${clientName}!</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.7;">Segue abaixo o seu pré-roteiro personalizado para o Uruguai. Nossa consultora entrará em contato em breve para prosseguir com a contratação.</p>
    `;

    const companyContent = `
      <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px; font-size: 15px; color: #0D3B8C;">Dados do Cliente</h3>
        <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Nome:</strong> ${clientName}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Telefone:</strong> ${clientPhone || 'Não informado'}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Email:</strong> ${clientEmail}</p>
      </div>
    `;

    const headers = { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY };

    await Promise.all([
      fetch(endpoint, {
        method: 'POST', headers,
        body: JSON.stringify({ to: clientEmail, subject: `Seu roteiro para o Uruguai - ${clientName}`, html: baseHtml(clientContent) }),
      }),
      fetch(endpoint, {
        method: 'POST', headers,
        body: JSON.stringify({ to: 'contato@brasileirosnouruguai.com.br', subject: `Novo roteiro - ${clientName} (${clientEmail})`, html: baseHtml(companyContent) }),
      }),
    ]);
  };

  // Send to consultant via Edge Function
  const handleSend = async () => {
    if (!id) return;
    setSendStatus('sending');
    try {
      const { data: { session: sendSession } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('send-to-consultant', {
        headers: { Authorization: `Bearer ${sendSession?.access_token}` },
        body: { itinerary_id: id },
      });

      if (error) throw error;

      await supabase
        .from('itineraries')
        .update({ status: 'sent_to_consultant', sent_at: new Date().toISOString() })
        .eq('id', id);

      // Send itinerary email to client + BNU copy
      if (answers.email && result) {
        const cleanText = result.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
        await sendItineraryEmail(
          answers.email,
          answers.nome || 'Cliente',
          answers.whatsapp || '',
          cleanText.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
        ).catch(console.error);
      }

      setSendMessage(data?.message || 'Solicitação registrada! A Consultora Especialista entrará em contato em breve.');
      setSendStatus('sent');
    } catch {
      setSendMessage('Solicitação registrada! A Consultora Especialista entrará em contato em breve.');
      setSendStatus('sent');
    }
  };

  // Chat via Edge Function
  const sendChat = async (msg: string) => {
    if (!msg.trim() || chatLoading) return;
    const userMsg = { role: 'user', content: msg };
    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatInput('');
    setChatLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[CHAT] session:', session ? 'exists' : 'null', 'token:', session?.access_token?.substring(0, 20) + '...');

      const response = await fetch(`https://avzuztbfowllcqjwobar.supabase.co/functions/v1/chat-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2enV6dGJmb3dsbGNxandvYmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MjczNzgsImV4cCI6MjA5MTQwMzM3OH0.2HYlbaMsj3F2H0XJntovADC3ej2TeWq6ckCyvAuIiV8',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          itinerary_id: id,
          message: msg,
        }),
      });

      console.log('[CHAT] response status:', response.status);
      const data = await response.json();
      console.log('[CHAT] response data:', data);

      const assistantContent = !response.ok
        ? 'Ops! Problema momentaneo. Tente novamente!'
        : data?.reply || 'Nao consegui responder agora. Tente novamente!';

      setChatMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Ops! Problema momentaneo. Tente novamente!' }]);
    }
    setChatLoading(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16, animation: 'bounce 1.2s ease-in-out infinite' }}>🗺️</div>
          <div style={{ color: '#0D3B8C', fontWeight: 700, fontSize: 16 }}>Carregando seu roteiro...</div>
        </div>
      </div>
    );
  }

  const PERFIS_MAP = Object.fromEntries(travelProfiles.map(p => [p.id, p]));
  const cidadeNames = Object.keys(answers.cidades || {}).map(k => cities.find(c => c.id === k)?.nome || k).join(', ');

  // Split result into roteiro and orcamento sections
  let roteiroText = result || '';
  let orcamentoText = '';
  if (result) {
    const orcIdx = result.search(/##.*[Oo]r[cç]amento|##.*Resumo.*Financeiro|##.*Valor.*Total/i);
    if (orcIdx > -1) {
      roteiroText = result.slice(0, orcIdx);
      orcamentoText = result.slice(orcIdx);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: 'linear-gradient(135deg, #0D3B8C, #1B6E3C)', padding: '24px 20px', textAlign: 'center', color: 'white' }}>
        <div style={{ display: 'inline-block', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', width: 52, height: 52, marginBottom: 12 }}>
          <img src={FAVICON_SRC} alt="BNU" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 2px' }}>Criador de Roteiro</h1>
        <p style={{ fontSize: 12, margin: '0 0 8px', opacity: 0.6, letterSpacing: 1, textTransform: 'uppercase' }}>Brasileiros no Uruguai</p>
        <p style={{ opacity: 0.9, margin: 0, fontSize: 14 }}>
          {answers.nome ? `Ola, ${answers.nome.split(' ')[0]}! ` : ''}Seu pre-roteiro personalizado esta pronto
        </p>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 20px 120px' }}>
        <div>
          {/* Chips */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            {[
              [PERFIS_MAP[answers.perfil || '']?.emoji || '👥', PERFIS_MAP[answers.perfil || '']?.label || 'Grupo'],
              ['👤', `${(answers.adultos || 0) + (answers.criancas || 0)} pessoa(s)`],
              ['📍', cidadeNames || 'Uruguai'],
              ['🏨', answers.hotel_estrelas ? `Hotel ${answers.hotel_estrelas} estrelas` : 'Hotel'],
            ].map(([emoji, label], i) => (
              <div key={i} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 100, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{emoji}</span><span>{label}</span>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <TripTimeline answers={answers} cities={cities} />

          {/* Roteiro */}
          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, padding: '28px 24px', marginBottom: 20 }}>
            <MarkdownText text={roteiroText} noBold={true} />
          </div>

          {/* Orcamento destacado */}
          {orcamentoText && (
            <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #F0FDF4)', border: '2px solid #0D3B8C', borderRadius: 16, padding: '28px 24px', marginBottom: 20 }}>
              <MarkdownText text={orcamentoText} noBold={false} />
              <div style={{ marginTop: 20, background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
                <div style={{ fontSize: 13, color: '#92400E', lineHeight: 1.6 }}>
                  Este e um roteiro sugerido com valores estimados. O valor real sera calculado pela consultora no momento da proposta.
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          {sendStatus === 'sent' ? (
            <div style={{ background: 'linear-gradient(135deg, #1B6E3C, #22C55E)', borderRadius: 16, padding: '24px', textAlign: 'center', color: 'white' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
              <h3 style={{ margin: '0 0 10px', fontSize: 18 }}>Solicitacao enviada!</h3>
              <p style={{ margin: 0, opacity: 0.9, fontSize: 14, lineHeight: 1.6 }}>{sendMessage}</p>
            </div>
          ) : (
            <div style={{ background: 'white', border: '2px solid #0D3B8C', borderRadius: 16, padding: '28px 24px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 20, color: '#0D3B8C', fontWeight: 800 }}>Gostou dos valores e condições da sua viagem?</h3>
              <p style={{ margin: '0 0 24px', color: '#334155', fontSize: 16, lineHeight: 1.7 }}>
                Se nao tiver mais duvidas, siga para o proximo passo enviando o seu roteiro para a nossa consultora e ela entrara em contato para prosseguir com a contratacao. Voce tambem pode alterar o roteiro ou tirar suas duvidas antes de enviar o roteiro para a consultora.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button onClick={handleSend} disabled={sendStatus === 'sending'}
                  style={{ width: '100%', padding: '16px 20px', border: 'none', borderRadius: 12, background: sendStatus === 'sending' ? '#E2E8F0' : 'linear-gradient(135deg, #0D3B8C, #1B6E3C)', color: sendStatus === 'sending' ? '#94A3B8' : 'white', fontWeight: 800, cursor: sendStatus === 'sending' ? 'not-allowed' : 'pointer', fontSize: 16 }}>
                  {sendStatus === 'sending' ? 'Enviando...' : '✅ Sim, seguir para a contratação'}
                </button>
                <button onClick={() => setChatOpen(true)}
                  style={{ width: '100%', padding: '16px 20px', border: '2px solid #F59E0B', borderRadius: 12, background: '#FFFBEB', color: '#92400E', fontWeight: 700, cursor: 'pointer', fontSize: 16 }}>
                  💬 Quero tirar dúvidas com um consultor
                </button>
                <button onClick={() => navigate(`/wizard/${id}`)} style={{ width: '100%', padding: '14px 20px', border: '2px solid #0D3B8C', borderRadius: 12, background: '#EFF6FF', color: '#0D3B8C', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
                  Revisar o meu roteiro
                </button>
              </div>
            </div>
          )}

          <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, marginTop: 20 }}>
            Pre-roteiro orientativo. Valores finais confirmados pela consultora.
          </p>
        </div>
      </div>

      <button onClick={() => setChatOpen(!chatOpen)}
        style={{ position: 'fixed', bottom: 24, right: 20, width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #0D3B8C, #1E5CB5)', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(13,59,140,0.4)', fontSize: 24, zIndex: 999, display: chatOpen ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
        💬
      </button>
      {chatOpen && <ChatPanel messages={chatMessages} input={chatInput} setInput={setChatInput} loading={chatLoading} onSend={sendChat} endRef={chatEndRef} onClose={() => setChatOpen(false)} />}

      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`}</style>
    </div>
  );
}
