import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface PromptConfig {
  id: number;
  system_prompt: string;
  updated_at: string;
}

export default function AIPromptEditor() {
  const { user } = useAuth();
  const [config, setConfig] = useState<PromptConfig | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('ai_prompt_config').select('*').eq('id', 1).single();
    if (data) { setConfig(data); setDraft(data.system_prompt); }
    setLoading(false);
  };

  const notify = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleChange = (v: string) => {
    setDraft(v);
    setHasChanges(v !== config?.system_prompt);
  };

  const save = async () => {
    setSaving(true);
    setShowConfirm(false);
    const { error } = await supabase.from('ai_prompt_config').update({
      system_prompt: draft,
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    }).eq('id', 1);

    if (error) {
      notify('Erro ao salvar: ' + error.message, false);
    } else {
      notify('Prompt publicado com sucesso! O Rodrigo já está usando a nova versão.');
      setHasChanges(false);
      load();
    }
    setSaving(false);
  };

  const reset = () => {
    if (config) { setDraft(config.system_prompt); setHasChanges(false); }
  };

  const charCount = draft.length;
  const wordCount = draft.split(/\s+/).filter(Boolean).length;

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Carregando prompt...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1E293B' }}>Prompt do Rodrigo</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
            Controla o comportamento, personalidade e conhecimentos do assistente virtual.
          </p>
          {config?.updated_at && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94A3B8' }}>
              Última atualização: {new Date(config.updated_at).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {hasChanges && (
            <span style={{ fontSize: 12, color: '#D97706', fontWeight: 600 }}>Alterações não salvas</span>
          )}
          <button onClick={reset} disabled={!hasChanges} style={{
            padding: '8px 16px', background: '#F1F5F9', border: 'none', borderRadius: 8,
            fontSize: 14, cursor: hasChanges ? 'pointer' : 'not-allowed', color: '#475569',
            opacity: hasChanges ? 1 : 0.5,
          }}>
            Descartar
          </button>
          <button onClick={() => setShowConfirm(true)} disabled={!hasChanges || saving} style={{
            padding: '8px 20px', background: hasChanges ? '#0D3B8C' : '#94A3B8',
            color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: hasChanges ? 'pointer' : 'not-allowed',
          }}>
            {saving ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14,
          background: msg.ok ? '#D1FAE5' : '#FEE2E2',
          color: msg.ok ? '#065F46' : '#991B1B',
        }}>{msg.text}</div>
      )}

      {/* Tips */}
      <div style={{
        padding: '12px 16px', background: '#EFF6FF', borderRadius: 10,
        border: '1px solid #BFDBFE', marginBottom: 16, fontSize: 13, color: '#1E40AF',
      }}>
        <strong>Dicas de edição:</strong> Use as seções com ═══ para separar blocos de conhecimento.
        A parte <strong>COMO SE COMPORTAR</strong> controla o tom e estilo. As <strong>REGRAS DO RODRIGO</strong> definem as regras de negócio absolutas.
        Alterações são aplicadas imediatamente após publicar — todas as novas conversas usarão o prompt atualizado.
      </div>

      {/* Code window */}
      <div style={{
        borderRadius: 12, overflow: 'hidden',
        border: `2px solid ${hasChanges ? '#3B82F6' : '#2D3748'}`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
      }}>
        {/* Title bar */}
        <div style={{
          background: '#1E2433', padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: '1px solid #2D3748',
        }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57', display: 'inline-block' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBC2E', display: 'inline-block' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840', display: 'inline-block' }} />
          <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 8, fontFamily: 'monospace' }}>
            system_prompt.txt
          </span>
          {hasChanges && (
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>● unsaved</span>
          )}
        </div>
        {/* Editor */}
        <div style={{ position: 'relative', background: '#0F1117' }}>
          <textarea
            value={draft}
            onChange={e => handleChange(e.target.value)}
            style={{
              width: '100%',
              minHeight: 580,
              padding: '16px 20px',
              border: 'none',
              borderRadius: 0,
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace",
              lineHeight: 1.75,
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
              color: '#E2E8F0',
              background: 'transparent',
              caretColor: '#3B82F6',
            }}
          />
          <div style={{
            position: 'absolute', bottom: 10, right: 16,
            fontSize: 11, color: '#4B5563', fontFamily: 'monospace', padding: '2px 6px',
            background: '#1A1F2E', borderRadius: 4,
          }}>
            {charCount.toLocaleString('pt-BR')} chars · {wordCount.toLocaleString('pt-BR')} palavras
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, padding: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#1E293B' }}>Publicar novo prompt?</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
              O Rodrigo passará a usar este prompt imediatamente em todas as novas conversas.
              Confirme apenas se o prompt foi revisado.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirm(false)} style={{
                padding: '10px 20px', background: '#F1F5F9', border: 'none',
                borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#475569',
              }}>
                Cancelar
              </button>
              <button onClick={save} style={{
                padding: '10px 24px', background: '#0D3B8C', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>
                Confirmar e Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
