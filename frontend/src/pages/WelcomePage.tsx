import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import faviconSrc from '../assets/favicon.png';

export default function WelcomePage() {
  const navigate = useNavigate();
  const { user, userNome, logout } = useAuth();
  const [creating, setCreating] = useState(false);

  const handleStart = async () => {
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

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(145deg, #0D2B5C 0%, #0D3B8C 40%, #1B6E3C 100%)',
        padding: '0 0 80px',
        textAlign: 'center',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Header bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px', position: 'relative', zIndex: 2,
        }}>
          <span style={{ fontWeight: 700, fontSize: 14, opacity: 0.9 }}>
            {userNome ? `Olá, ${userNome.split(' ')[0]}!` : 'BNU'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/roteiro-personalizado" style={{
              color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 600,
              background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: 8,
            }}>
              Meus Roteiros
            </Link>
            <button onClick={logout} style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: 'white', padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
            }}>
              Sair
            </button>
          </div>
        </div>

        {/* Subtle rings */}
        {[200, 320, 440].map((s, i) => (
          <div key={i} style={{
            position: 'absolute', width: s, height: s, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.06)',
            top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          }} />
        ))}

        <div style={{ position: 'relative', zIndex: 1, padding: '40px 24px 0' }}>
          <div style={{
            display: 'inline-block', marginBottom: 20, borderRadius: 24,
            overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
            width: 96, height: 96,
          }}>
            <img src={faviconSrc} alt="BNU" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 6px', letterSpacing: -1, lineHeight: 1.1 }}>
            Seu Roteiro Perfeito para o Uruguai
          </h1>
          <p style={{ fontSize: 13, fontWeight: 400, margin: '0 0 4px', opacity: 0.6, letterSpacing: 2, textTransform: 'uppercase' }}>
            Brasileiros no Uruguai
          </p>
          <a href="https://brasileirosnouruguai.com.br/" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: 28, textDecoration: 'none' }}>
            brasileirosnouruguai.com.br
          </a>
          <div style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 20, padding: '24px 28px', maxWidth: 480, margin: '0 auto 36px', textAlign: 'left',
          }}>
            <p style={{ fontSize: 16, lineHeight: 1.8, margin: '0 0 12px', opacity: 0.95 }}>
              Você acaba de ganhar acesso ao seu planejador de viagem para o Uruguai! 😊
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.75, margin: '0 0 12px', opacity: 0.85 }}>
              🗺️ Este é o seu planejador exclusivo: um especialista dedicado a entender cada detalhe da sua viagem e transformar isso em um roteiro sob medida, com as melhores dicas, os passeios certos para o seu perfil e suporte para cada dúvida que surgir.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.75, margin: 0, opacity: 0.95, fontWeight: 600 }}>
              ✈️ Vamos montar algo incrível juntos. Vamos começar?
            </p>
          </div>
          <button
            onClick={handleStart}
            disabled={creating}
            style={{
              background: 'white', color: '#0D3B8C', border: 'none',
              padding: '18px 52px', borderRadius: 100, fontSize: 17, fontWeight: 800,
              cursor: creating ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)', letterSpacing: 0.3,
              transition: 'transform 0.15s', opacity: creating ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (!creating) (e.target as HTMLButtonElement).style.transform = 'scale(1.04)'; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.transform = 'scale(1)'; }}
          >
            {creating ? 'Criando...' : 'Começar Meu Roteiro'}
          </button>
          <p style={{ marginTop: 14, fontSize: 13, opacity: 0.55 }}>Leva apenas 3 minutos</p>
        </div>
      </div>

      {/* How it works */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px 0' }}>
        <h2 style={{ textAlign: 'center', fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 32 }}>
          Como funciona
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 40 }}>
          {([
            ['📝', 'Responda as perguntas', 'Informe suas preferências, datas e cidades de interesse'],
            ['🗺️', 'Receba o roteiro', 'O sistema monta um pré-roteiro com passeios e orçamento'],
            ['📩', 'Fale com a consultora', 'Envie para a Consultora Especialista confirmar e fechar sua reserva'],
          ] as const).map(([emoji, title, desc]) => (
            <div key={title} style={{
              textAlign: 'center', padding: '24px 16px', background: 'white',
              borderRadius: 16, border: '1px solid #E2E8F0',
            }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0D3B8C', marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Chat callout */}
        <div style={{
          background: 'linear-gradient(135deg, #EFF6FF, #F0FDF4)',
          border: '2px solid #0D3B8C', borderRadius: 20, padding: '24px 28px',
          marginBottom: 40, display: 'flex', gap: 20, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, #0D3B8C, #1B6E3C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, flexShrink: 0,
          }}>
            🧑‍💼
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#0D3B8C', marginBottom: 6 }}>
              Rodrigo está aqui para te ajudar!
            </div>
            <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.6 }}>
              Em qualquer etapa do formulário, clique no <strong>botão de chat</strong> no canto da tela para tirar dúvidas com o Rodrigo, nosso consultor especialista em roteiros para o Uruguai. Ele responde na hora!
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', paddingBottom: 40 }}>
          <button
            onClick={handleStart}
            disabled={creating}
            style={{
              background: 'linear-gradient(135deg, #0D3B8C, #1B6E3C)',
              color: 'white', border: 'none', padding: '16px 48px', borderRadius: 100,
              fontSize: 16, fontWeight: 800, cursor: creating ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 20px rgba(13,59,140,0.3)',
            }}
          >
            {creating ? 'Criando...' : 'Começar'}
          </button>
        </div>
      </div>
    </div>
  );
}
