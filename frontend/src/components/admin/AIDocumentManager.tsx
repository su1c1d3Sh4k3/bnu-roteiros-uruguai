import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

interface AIDocument {
  id: string;
  name: string;
  description: string;
  when_to_use: string;
  file_url: string;
  content_text: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const EMPTY: Omit<AIDocument, 'id' | 'created_at' | 'updated_at'> = {
  name: '', description: '', when_to_use: '', file_url: '', content_text: '', active: true,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1',
  borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#475569',
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em',
};

export default function AIDocumentManager() {
  const [docs, setDocs] = useState<AIDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AIDocument | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('ai_documents').select('*').order('created_at', { ascending: false });
    setDocs(data || []);
    setLoading(false);
  };

  const notify = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const openNew = () => {
    setIsNew(true);
    setEditing({ id: '', ...EMPTY, created_at: '', updated_at: '' });
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('ai_documents').update({ active: !current }).eq('id', id);
    setDocs(prev => prev.map(d => d.id === id ? { ...d, active: !current } : d));
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await supabase.from('ai_documents').delete().eq('id', deleteId);
    setDeleteId(null);
    notify('Documento removido.');
    load();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);
    const path = `ai-docs/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('ai-documents').upload(path, file, { upsert: true });
    if (error) { notify('Erro no upload: ' + error.message, false); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('ai-documents').getPublicUrl(path);
    setEditing(prev => prev ? { ...prev, file_url: publicUrl } : prev);
    setUploading(false);
    notify('Arquivo enviado!');
  };

  const handleTextImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    const text = await file.text();
    setEditing(prev => prev ? { ...prev, content_text: text, name: prev.name || file.name.replace(/\.[^.]+$/, '') } : prev);
    notify('Texto importado — revise antes de salvar.');
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name) { notify('Nome é obrigatório', false); return; }
    setSaving(true);
    const payload = {
      name: editing.name,
      description: editing.description,
      when_to_use: editing.when_to_use,
      file_url: editing.file_url,
      content_text: editing.content_text,
      active: editing.active,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (isNew) {
      ({ error } = await supabase.from('ai_documents').insert(payload));
    } else {
      ({ error } = await supabase.from('ai_documents').update(payload).eq('id', editing.id));
    }

    if (error) { notify('Erro: ' + error.message, false); }
    else { notify('Documento salvo!'); setEditing(null); load(); }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Carregando documentos...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1E293B' }}>Documentos de Contexto</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
            Documentos que o Rodrigo consulta em situações específicas — ex: promoções, FAQ especial, novidades.
          </p>
        </div>
        <button onClick={openNew} style={{
          padding: '8px 16px', background: '#0D3B8C', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          + Novo Documento
        </button>
      </div>

      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14,
          background: msg.ok ? '#D1FAE5' : '#FEE2E2',
          color: msg.ok ? '#065F46' : '#991B1B',
        }}>{msg.text}</div>
      )}

      {/* Info box */}
      <div style={{
        padding: '12px 16px', background: '#EFF6FF', borderRadius: 10,
        border: '1px solid #BFDBFE', marginBottom: 20, fontSize: 13, color: '#1E40AF',
      }}>
        <strong>Como funciona:</strong> Documentos ativos com "Quando usar" preenchido são injetados no contexto do Rodrigo
        antes da resposta. Preencha o campo <em>Quando usar</em> com precisão — ex: "quando o cliente perguntar sobre promoções de julho".
      </div>

      {docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Nenhum documento ainda</div>
          <div style={{ fontSize: 13 }}>Adicione documentos para enriquecer o contexto do Rodrigo.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {docs.map(doc => (
            <div key={doc.id} style={{
              background: '#fff', borderRadius: 12, border: `1px solid ${doc.active ? '#E2E8F0' : '#F1F5F9'}`,
              padding: 20, opacity: doc.active ? 1 : 0.6,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 20 }}>📄</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#1E293B' }}>{doc.name}</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: doc.active ? '#D1FAE5' : '#F1F5F9',
                      color: doc.active ? '#065F46' : '#94A3B8',
                    }}>{doc.active ? 'Ativo' : 'Inativo'}</span>
                  </div>
                  {doc.description && (
                    <div style={{ fontSize: 13, color: '#64748B', marginBottom: 6, marginLeft: 30 }}>{doc.description}</div>
                  )}
                  {doc.when_to_use && (
                    <div style={{ fontSize: 12, color: '#7C3AED', background: '#F5F3FF', padding: '4px 10px', borderRadius: 6, display: 'inline-block', marginLeft: 30 }}>
                      Usar quando: {doc.when_to_use}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 8, marginLeft: 30 }}>
                    {doc.content_text ? `${doc.content_text.length.toLocaleString('pt-BR')} chars de conteúdo` : 'Sem conteúdo de texto'} ·
                    Criado em {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => toggleActive(doc.id, doc.active)} style={{
                    padding: '6px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0',
                    borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#475569',
                  }}>
                    {doc.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button onClick={() => { setIsNew(false); setEditing({ ...doc }); }} style={{
                    padding: '6px 14px', background: '#EFF6FF', color: '#0D3B8C',
                    border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Editar
                  </button>
                  <button onClick={() => setDeleteId(doc.id)} style={{
                    padding: '6px 10px', background: '#FEF2F2', color: '#DC2626',
                    border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                  }}>
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create Modal */}
      {editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={e => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 660,
            maxHeight: '90vh', overflowY: 'auto', padding: 32,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1E293B' }}>
                {isNew ? 'Novo Documento' : `Editar: ${editing.name}`}
              </h3>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Nome do Documento</label>
                <input style={inputStyle} value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : p)} placeholder="ex: Promoções de Julho 2026" />
              </div>

              <div>
                <label style={labelStyle}>Descrição (interna)</label>
                <input style={inputStyle} value={editing.description} onChange={e => setEditing(p => p ? { ...p, description: e.target.value } : p)} placeholder="Para que serve este documento" />
              </div>

              <div>
                <label style={labelStyle}>Quando usar (instrução para a IA)</label>
                <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
                  value={editing.when_to_use}
                  onChange={e => setEditing(p => p ? { ...p, when_to_use: e.target.value } : p)}
                  placeholder='ex: "Quando o cliente perguntar sobre promoções ou descontos disponíveis"' />
              </div>

              <div>
                <label style={labelStyle}>Upload de arquivo (opcional)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inputStyle, flex: 1 }} value={editing.file_url} onChange={e => setEditing(p => p ? { ...p, file_url: e.target.value } : p)} placeholder="URL do arquivo ou faça upload" />
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
                    padding: '8px 14px', background: '#F1F5F9', border: '1px solid #CBD5E1',
                    borderRadius: 8, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>
                    {uploading ? '...' : 'Upload'}
                  </button>
                  <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={labelStyle}>Conteúdo de texto (injetado no contexto da IA)</label>
                  <button onClick={() => textFileRef.current?.click()} style={{
                    padding: '4px 10px', background: '#EFF6FF', color: '#0D3B8C',
                    border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  }}>
                    Importar .txt/.md
                  </button>
                  <input ref={textFileRef} type="file" accept=".txt,.md,.csv" style={{ display: 'none' }} onChange={handleTextImport} />
                </div>
                <textarea style={{ ...inputStyle, minHeight: 200, resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }}
                  value={editing.content_text}
                  onChange={e => setEditing(p => p ? { ...p, content_text: e.target.value } : p)}
                  placeholder="Cole ou escreva aqui o conteúdo que o Rodrigo deve consultar..." />
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                  {editing.content_text.length.toLocaleString('pt-BR')} caracteres
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="doc_active" checked={editing.active} onChange={e => setEditing(p => p ? { ...p, active: e.target.checked } : p)} style={{ width: 16, height: 16 }} />
                <label htmlFor="doc_active" style={{ fontSize: 14, color: '#475569', fontWeight: 600 }}>Documento ativo</label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(null)} style={{ padding: '10px 20px', background: '#F1F5F9', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#475569' }}>
                Cancelar
              </button>
              <button onClick={save} disabled={saving} style={{
                padding: '10px 24px', background: '#0D3B8C', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
              }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 380, padding: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#1E293B' }}>Excluir documento?</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748B' }}>Esta ação não pode ser desfeita.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: '10px 20px', background: '#F1F5F9', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmDelete} style={{ padding: '10px 20px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
