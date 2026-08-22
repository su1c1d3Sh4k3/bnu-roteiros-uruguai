import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

function AdminLoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    const { error: loginError, isAdmin } = await login(email.trim(), senha);
    if (loginError) {
      setError(loginError);
    } else if (!isAdmin) {
      setError('Esta conta não tem acesso administrativo.');
    }
    // Se isAdmin, o AdminRoute re-renderiza e mostra o painel automaticamente
    setSubmitting(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1px solid #CBD5E1', fontSize: 15, outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F1F5F9', fontFamily: "'Segoe UI', system-ui, sans-serif", padding: 20,
    }}>
      <form onSubmit={handleSubmit} style={{
        background: 'white', borderRadius: 20, border: '1px solid #E2E8F0',
        padding: '36px 32px', width: '100%', maxWidth: 400,
        boxShadow: '0 8px 32px rgba(13,59,140,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: 'linear-gradient(135deg, #0D3B8C, #1B6E3C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', fontSize: 24,
          }}>⚙️</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
            Painel Administrativo
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Brasileiros no Uruguai</p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
            E-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@email.com"
            required
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
            Senha
          </label>
          <input
            type="password"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            placeholder="••••••••"
            required
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C',
            borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%', padding: '14px', border: 'none', borderRadius: 100,
            background: 'linear-gradient(135deg, #0D3B8C, #1B6E3C)', color: 'white',
            fontSize: 15, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#F1F5F9', fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: 'linear-gradient(135deg, #0D3B8C, #1B6E3C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', fontSize: 24,
          }}>⚙️</div>
          <div style={{ color: '#0D3B8C', fontWeight: 700, fontSize: 15 }}>Carregando...</div>
        </div>
      </div>
    );
  }

  // Sem sessão, sessão anônima ou usuário sem permissão → formulário de login
  if (!session || session.user.is_anonymous || !isAdmin) return <AdminLoginForm />;

  return <>{children}</>;
}
