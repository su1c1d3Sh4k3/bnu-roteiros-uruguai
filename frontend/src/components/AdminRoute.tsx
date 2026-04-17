import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, isAdmin, loading, profileLoaded } = useAuth();
  const location = useLocation();

  // Aguarda tanto o check de sessão quanto o carregamento do perfil
  if (loading || (session && !profileLoaded)) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F1F5F9',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #0D3B8C, #1B6E3C)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            fontSize: 24,
          }}>
            ⚙️
          </div>
          <div style={{ color: '#0D3B8C', fontWeight: 700, fontSize: 15 }}>Carregando painel...</div>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
