import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ItineraryWithAnswers {
  id: string;
  status: 'draft' | 'generated' | 'sent_to_consultant';
  created_at: string;
  updated_at: string;
  itinerary_answers: {
    nome: string;
    cidades: Record<string, number | string>;
    data_ida: string;
    data_volta: string;
    current_step: number;
  }[] | null;
}

const STATUS_CONFIG = {
  draft: { label: 'Rascunho', color: '#F59E0B', bg: '#FFFBEB', border: '#F59E0B' },
  generated: { label: 'Gerado', color: '#1B6E3C', bg: '#F0FDF4', border: '#22C55E' },
  sent_to_consultant: { label: 'Enviado', color: '#0D3B8C', bg: '#EFF6FF', border: '#3B82F6' },
};

export default function MyItinerariesPage() {
  const navigate = useNavigate();
  const { user, userNome } = useAuth();
  const [itineraries, setItineraries] = useState<ItineraryWithAnswers[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchContact, setSearchContact] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');

  const loadItineraries = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('itineraries')
        .select(`
          id,
          status,
          created_at,
          updated_at,
          itinerary_answers (
            nome,
            cidades,
            data_ida,
            data_volta,
            current_step
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (data) {
        setItineraries(data as unknown as ItineraryWithAnswers[]);
      }
    } catch (err) {
      console.error('Erro ao carregar roteiros:', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadItineraries(user.id).finally(() => setLoading(false));
  }, [user]);

  // Busca roteiros criados em outro navegador/aparelho pelo e-mail ou
  // telefone informado na etapa 1 do wizard (os roteiros encontrados
  // passam a pertencer à sessão atual)
  const handleSearch = async () => {
    const contact = searchContact.trim();
    if (!user || searching || !contact) return;
    setSearching(true);
    setSearchMessage('');
    try {
      const { data, error } = await supabase.rpc('claim_itineraries_by_contact', {
        p_contact: contact,
      });
      if (error) throw error;
      const found = (data as string[] | null)?.length ?? 0;
      if (found > 0) {
        setSearchMessage(`${found} roteiro${found > 1 ? 's' : ''} encontrado${found > 1 ? 's' : ''}!`);
        await loadItineraries(user.id);
      } else {
        setSearchMessage('Nenhum roteiro encontrado com esse e-mail ou telefone.');
      }
    } catch (err) {
      console.error('Erro ao buscar roteiros:', err);
      setSearchMessage('Erro ao buscar. Tente novamente.');
    }
    setSearching(false);
  };

  const handleNewItinerary = async () => {
    if (!user || creating) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('itineraries')
        .insert({ user_id: user.id, status: 'draft' })
        .select('id')
        .single();

      if (error) throw error;

      await supabase.from('itinerary_answers').insert({
        itinerary_id: data.id,
        adultos: 1,
        criancas: 0,
        current_step: 0,
      });

      navigate(`/wizard/${data.id}`);
    } catch (err) {
      console.error('Erro ao criar roteiro:', err);
      alert('Erro ao criar roteiro. Tente novamente.');
    }
    setCreating(false);
  };

  const handleClick = (it: ItineraryWithAnswers) => {
    if (it.status === 'draft') {
      navigate(`/wizard/${it.id}`);
    } else {
      navigate(`/result/${it.id}`);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getCidadesText = (cidades: Record<string, number | string> | null | undefined) => {
    if (!cidades || Object.keys(cidades).length === 0) return 'Cidades não definidas';
    const CITY_NAMES: Record<string, string> = {
      mvd: 'Montevidéu', pde: 'Punta del Este', col: 'Colonia del Sacramento',
      jose: 'José Ignácio', carmelo: 'Carmelo', outro: 'Outro',
    };
    return Object.keys(cidades).map(k => CITY_NAMES[k] || k).join(', ');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0D3B8C, #1B6E3C)',
        padding: '20px 24px',
        color: 'white',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Meus Roteiros</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {userNome ? `${userNome.split(' ')[0]}` : 'Brasileiros no Uruguai'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/" style={{
              color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 600,
              background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: 8,
            }}>
              Início
            </Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 20px' }}>
        {/* Search itineraries by contact */}
        <div style={{
          background: 'white', border: '1px solid #E2E8F0', borderRadius: 16,
          padding: '18px 20px', marginBottom: 16,
        }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 4 }}>
            Já criou um roteiro antes?
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
            Busque pelo e-mail ou telefone informado no cadastro do roteiro.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={searchContact}
              onChange={e => { setSearchContact(e.target.value); setSearchMessage(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="seu@email.com ou (11) 99999-9999"
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10,
                border: '1px solid #CBD5E1', fontSize: 14, outline: 'none',
              }}
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchContact.trim()}
              style={{
                background: 'linear-gradient(135deg, #0D3B8C, #1B6E3C)', color: 'white',
                border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14,
                fontWeight: 700, cursor: searching || !searchContact.trim() ? 'not-allowed' : 'pointer',
                opacity: searching || !searchContact.trim() ? 0.6 : 1, whiteSpace: 'nowrap',
              }}
            >
              {searching ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          {searchMessage && (
            <div style={{
              marginTop: 10, fontSize: 13, fontWeight: 600,
              color: searchMessage.includes('encontrado!') || searchMessage.includes('encontrados!') ? '#1B6E3C' : '#B45309',
            }}>
              {searchMessage}
            </div>
          )}
        </div>

        {/* New itinerary button */}
        <button
          onClick={handleNewItinerary}
          disabled={creating}
          style={{
            width: '100%', padding: '16px', border: '2px dashed #0D3B8C', borderRadius: 16,
            background: '#EFF6FF', cursor: creating ? 'not-allowed' : 'pointer',
            fontWeight: 700, fontSize: 16, color: '#0D3B8C', marginBottom: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}
        >
          <span style={{ fontSize: 20 }}>+</span>
          {creating ? 'Criando...' : 'Novo Roteiro'}
        </button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16, animation: 'bounce 1.2s ease-in-out infinite' }}>🗺️</div>
            <div style={{ color: '#0D3B8C', fontWeight: 700, fontSize: 16 }}>Carregando seus roteiros...</div>
            <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`}</style>
          </div>
        ) : itineraries.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px', background: 'white',
            borderRadius: 20, border: '1px solid #E2E8F0',
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🗺️</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 12px' }}>
              Nenhum roteiro ainda
            </h2>
            <p style={{ color: '#64748B', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>
              Crie seu primeiro roteiro personalizado para o Uruguai! Leva apenas 3 minutos.
            </p>
            <button
              onClick={handleNewItinerary}
              disabled={creating}
              style={{
                background: 'linear-gradient(135deg, #0D3B8C, #1B6E3C)',
                color: 'white', border: 'none', padding: '16px 48px', borderRadius: 100,
                fontSize: 16, fontWeight: 800, cursor: creating ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 20px rgba(13,59,140,0.3)',
              }}
            >
              {creating ? 'Criando...' : 'Criar Meu Primeiro Roteiro'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {itineraries.map(it => {
              const ans = it.itinerary_answers?.[0];
              const status = STATUS_CONFIG[it.status];
              return (
                <div
                  key={it.id}
                  onClick={() => handleClick(it)}
                  style={{
                    background: 'white', border: '1px solid #E2E8F0', borderRadius: 16,
                    padding: '20px 24px', cursor: 'pointer', transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#0D3B8C'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(13,59,140,0.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#E2E8F0'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>
                        {ans?.nome ? ans.nome.split(' ')[0] : 'Roteiro'}
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                        background: status.bg, color: status.color, border: `1px solid ${status.border}`,
                      }}>
                        {status.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#64748B', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span>📅 {formatDate(it.created_at)}</span>
                      <span>📍 {getCidadesText(ans?.cidades)}</span>
                      {ans?.data_ida && <span>✈️ {ans.data_ida} → {ans.data_volta}</span>}
                    </div>
                    {it.status === 'draft' && ans && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: '#E2E8F0', borderRadius: 2 }}>
                            <div style={{ height: '100%', width: `${((ans.current_step + 1) / 11) * 100}%`, background: 'linear-gradient(90deg, #0D3B8C, #1B6E3C)', borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>
                            {ans.current_step + 1}/11
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ color: '#0D3B8C', fontSize: 20, marginLeft: 12, flexShrink: 0 }}>›</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
