import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import faviconSrc from '../assets/favicon.png';

export default function RegisterPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!nome.trim() || !email.trim() || !password.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const { error: signupError } = await signup(email, password, { nome, whatsapp });
    if (signupError) {
      setError(signupError);
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{
        background: 'linear-gradient(145deg, #0D2B5C 0%, #0D3B8C 40%, #1B6E3C 100%)',
        padding: '48px 24px 64px',
        textAlign: 'center',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {[200, 320, 440].map((s, i) => (
          <div key={i} style={{
            position: 'absolute', width: s, height: s, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.06)',
            top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          }} />
        ))}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-block', marginBottom: 16, borderRadius: 20,
            overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
            width: 80, height: 80,
          }}>
            <img src={faviconSrc} alt="BNU" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 4px', letterSpacing: -0.5 }}>
            Brasileiros no Uruguai
          </h1>
          <p style={{ fontSize: 13, opacity: 0.6, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>
            Planejador de Roteiros
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 420, margin: '-32px auto 0', padding: '0 24px 40px', position: 'relative', zIndex: 2 }}>
        <div style={{
          background: 'white', borderRadius: 20, padding: '32px 28px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0',
        }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 24px', textAlign: 'center' }}>
            Criar sua conta
          </h2>

          {error && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12,
              padding: '12px 16px', marginBottom: 20, fontSize: 14, color: '#DC2626',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                Nome completo *
              </label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Ana Lima"
                style={{
                  width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 10,
                  padding: '12px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
                onFocus={e => (e.target.style.borderColor = '#0D3B8C')}
                onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                E-mail *
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                style={{
                  width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 10,
                  padding: '12px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
                onFocus={e => (e.target.style.borderColor = '#0D3B8C')}
                onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                WhatsApp
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="Ex: (11) 99999-9999"
                style={{
                  width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 10,
                  padding: '12px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
                onFocus={e => (e.target.style.borderColor = '#0D3B8C')}
                onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                Senha *
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                style={{
                  width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 10,
                  padding: '12px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
                onFocus={e => (e.target.style.borderColor = '#0D3B8C')}
                onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px', border: 'none', borderRadius: 12,
                background: loading ? '#E2E8F0' : 'linear-gradient(135deg, #0D3B8C, #1B6E3C)',
                color: loading ? '#94A3B8' : 'white', fontWeight: 800, fontSize: 16,
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              }}
            >
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link
              to="/login"
              style={{
                color: '#0D3B8C', fontWeight: 600, fontSize: 14,
                textDecoration: 'none',
              }}
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
