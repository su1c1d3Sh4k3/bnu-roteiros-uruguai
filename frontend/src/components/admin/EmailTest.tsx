import { useState } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function EmailTest() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  const sendTestEmail = async () => {
    setSending(true);
    setResult(null);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
        },
        body: JSON.stringify({
          to: 'suicideshake@gmail.com',
          subject: 'BNU Roteiros - Teste de Email',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #0D3B8C, #1B6E3C); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 24px;">BNU Roteiros Uruguai</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Teste de Email</p>
              </div>
              <div style="background: #fff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="color: #334155; font-size: 16px; line-height: 1.6;">
                  Este e um email de teste enviado pelo painel admin do BNU Roteiros Uruguai.
                </p>
                <p style="color: #64748b; font-size: 14px;">
                  Se voce recebeu este email, a configuracao SMTP esta funcionando corretamente.
                </p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                  Enviado em ${new Date().toLocaleString('pt-BR')} via smtp-relay.gmail.com
                </p>
              </div>
            </div>
          `,
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({ success: false, error: String(err) });
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
        padding: 32, maxWidth: 600,
      }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 18, color: '#1E293B' }}>Teste de Email SMTP</h2>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748B', lineHeight: 1.5 }}>
          Envia um email de teste para <strong>suicideshake@gmail.com</strong> via smtp-relay.gmail.com
          para verificar se a infraestrutura de email esta funcionando.
        </p>

        <div style={{
          background: '#F8FAFC', borderRadius: 8, padding: 16, marginBottom: 24,
          border: '1px solid #E2E8F0', fontSize: 13, color: '#475569',
        }}>
          <div style={{ marginBottom: 8 }}><strong>Rota:</strong> Frontend → Edge Function → VPS API (:3001) → SMTP Relay</div>
          <div style={{ marginBottom: 8 }}><strong>Remetente:</strong> contato@brasileirosnouruguai.com.br</div>
          <div><strong>Destinatario:</strong> suicideshake@gmail.com</div>
        </div>

        <button
          onClick={sendTestEmail}
          disabled={sending}
          style={{
            padding: '12px 28px', background: sending ? '#94A3B8' : '#0D3B8C',
            color: '#fff', border: 'none', borderRadius: 8, fontSize: 14,
            fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {sending ? 'Enviando...' : 'Enviar Email de Teste'}
        </button>

        {result && (
          <div style={{
            marginTop: 20, padding: 16, borderRadius: 8,
            background: result.success ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${result.success ? '#BBF7D0' : '#FECACA'}`,
            color: result.success ? '#166534' : '#991B1B',
            fontSize: 14,
          }}>
            {result.success
              ? `Email enviado com sucesso! ${result.message || ''}`
              : `Erro: ${result.error || 'Falha desconhecida'}`
            }
          </div>
        )}
      </div>
    </div>
  );
}
