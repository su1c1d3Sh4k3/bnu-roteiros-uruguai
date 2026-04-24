import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TourManager from '../components/admin/TourManager';
import CityManager from '../components/admin/CityManager';
import HotelManager from '../components/admin/HotelManager';
import TransferManager from '../components/admin/TransferManager';
import AIPromptEditor from '../components/admin/AIPromptEditor';
import AIDocumentManager from '../components/admin/AIDocumentManager';
import EmailTest from '../components/admin/EmailTest';

type Tab = 'tours' | 'cities' | 'hotels' | 'transfers' | 'ai-prompt' | 'ai-docs' | 'email';

interface NavItem {
  id: Tab;
  label: string;
  icon: string;
  section?: string;
}

const NAV: NavItem[] = [
  { id: 'tours',    label: 'Passeios',    icon: '🗺️',  section: 'Produtos' },
  { id: 'cities',   label: 'Cidades',     icon: '🏙️',  section: 'Produtos' },
  { id: 'hotels',   label: 'Hotéis',      icon: '🏨',  section: 'Produtos' },
  { id: 'transfers',label: 'Transfers',   icon: '🚗',  section: 'Produtos' },
  { id: 'ai-prompt',label: 'Prompt Rodrigo', icon: '🤖', section: 'Inteligência Artificial' },
  { id: 'ai-docs',  label: 'Documentos',  icon: '📄',  section: 'Inteligência Artificial' },
  { id: 'email',    label: 'Teste Email', icon: '✉️',  section: 'Sistema' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('tours');
  const { userNome, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'tours':     return <TourManager />;
      case 'cities':    return <CityManager />;
      case 'hotels':    return <HotelManager />;
      case 'transfers': return <TransferManager />;
      case 'ai-prompt': return <AIPromptEditor />;
      case 'ai-docs':   return <AIDocumentManager />;
      case 'email':     return <EmailTest />;
    }
  };

  // Group nav items by section
  const sections = NAV.reduce<Record<string, NavItem[]>>((acc, item) => {
    const s = item.section || '';
    if (!acc[s]) acc[s] = [];
    acc[s].push(item);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Segoe UI', system-ui, sans-serif", background: '#F1F5F9' }}>

      {/* Sidebar */}
      <div style={{
        width: 240, background: '#0D3B8C', display: 'flex', flexDirection: 'column',
        flexShrink: 0, position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'linear-gradient(135deg, #1B6E3C, #2ECC71)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>🇺🇾</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>BNU Admin</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Painel de Controle</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {Object.entries(sections).map(([section, items]) => (
            <div key={section}>
              <div style={{
                padding: '10px 20px 4px',
                fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                {section}
              </div>
              {items.map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
                  width: '100%', padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 10,
                  background: activeTab === item.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderLeft: activeTab === item.id ? '3px solid #fff' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{
                    fontSize: 14, fontWeight: activeTab === item.id ? 600 : 400,
                    color: activeTab === item.id ? '#fff' : 'rgba(255,255,255,0.7)',
                  }}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
            Conectado como
          </div>
          <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userNome || 'Admin'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/')} style={{
              flex: 1, padding: '7px 0', background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: 6, fontSize: 12, color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
            }}>
              ← Site
            </button>
            <button onClick={handleLogout} style={{
              flex: 1, padding: '7px 0', background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: 6, fontSize: 12, color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
            }}>
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #E2E8F0',
          padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E293B' }}>
              {NAV.find(n => n.id === activeTab)?.icon} {NAV.find(n => n.id === activeTab)?.label}
            </h1>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
              {NAV.find(n => n.id === activeTab)?.section}
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '28px 32px', flex: 1, overflowY: 'auto' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
