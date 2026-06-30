import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../core/services/supabase';
import { useUser } from '../../../core/contexts/UserContext';
import { extractTextAndData } from '../../../core/services/cvAnalyzer';
import { TagInput } from '../../../common/components/TagInput';
import { X, Upload, Check, AlertCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

interface PoolAddCandidateProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FileEntry {
  file: File;
  status: 'pending' | 'uploading' | 'extracting' | 'done' | 'error';
  errorMessage?: string;
}

export const PoolAddCandidate = ({ isOpen, onClose, onSuccess }: PoolAddCandidateProps) => {
  const { profile } = useUser();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const check = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    check(mq);
    mq.addEventListener('change', check);
    return () => mq.removeEventListener('change', check);
  }, []);

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [batchTags, setBatchTags] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase.from('tags').select('name')
      .eq('organization_id', profile.organization_id)
      .then(({ data }) => {
        setTagSuggestions((data ?? []).map(r => r.name));
      }, () => {});
  }, [profile?.organization_id]);

  const reset = useCallback(() => {
    setFiles([]);
    setBatchTags([]);
    setProcessing(false);
    setDone(false);
    setSuccessCount(0);
    setErrorCount(0);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const maxSize = 10 * 1024 * 1024;
    const maxFiles = 100;
    const valid: FileEntry[] = [];

    for (const f of Array.from(incoming)) {
      if (f.type !== 'application/pdf') {
        toast.error(`"${f.name}" não é PDF — ignorado`);
        continue;
      }
      if (f.size > maxSize) {
        toast.error(`"${f.name}" > 10MB — ignorado`);
        continue;
      }
      if (valid.length + files.length >= maxFiles) {
        toast.error('Máximo de 20 arquivos por vez');
        break;
      }
      valid.push({ file: f, status: 'pending' });
    }
    if (valid.length) setFiles(prev => [...prev, ...valid]);
  }, [files.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
  }, [addFiles]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const startProcessing = useCallback(async () => {
    if (!profile?.organization_id || !profile?.userId) {
      toast.error('Usuário não autenticado');
      return;
    }
    if (!files.length) return;

    setProcessing(true);
    let success = 0;
    let errors = 0;

    for (let i = 0; i < files.length; i++) {
      const entry = files[i];
      if (entry.status === 'done') { success++; continue; }
      if (entry.status === 'error') { errors++; continue; }

      // Upload
      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading' } : f));
      try {
        const uuid = crypto.randomUUID().substring(0, 8);
        const filePath = `resumes/manual/${profile.organization_id}/${Date.now()}_${uuid}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from('job-applications')
          .upload(filePath, entry.file, { cacheControl: '3600', upsert: false, contentType: 'application/pdf' });
        if (uploadError) throw uploadError;

        // Extraction
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'extracting' } : f));
        const { rawText, extractedData } = await extractTextAndData(entry.file);

        // Tags manuais do batch (definidas pelo usuário)
        const tags = batchTags;

        // Insert candidate
        const candidateData: Record<string, unknown> = {
          name: extractedData.name && extractedData.name !== 'Não identificado' ? extractedData.name : entry.file.name.replace('.pdf', ''),
          organization_id: profile.organization_id,
          user_id: profile.userId,
          status: 'pending',
          source: 'manual_add',
          raw_text: rawText,
          is_analyzed: true,
          tags,
        };
        if (extractedData.email) candidateData.email = extractedData.email;
        if (extractedData.phone) candidateData.phone = extractedData.phone;
        if (extractedData.location) candidateData.location = extractedData.location;
        if (extractedData.age) candidateData.age = extractedData.age;
        if (extractedData.gender && extractedData.gender !== 'Não identificado') candidateData.gender = extractedData.gender;
        if (extractedData.linkedin) candidateData.linkedin = extractedData.linkedin;
        if (extractedData.portfolio) candidateData.portfolio = extractedData.portfolio;
        if (extractedData.skills.length) candidateData.skills = extractedData.skills;
        if (extractedData.experience && extractedData.experience !== 'Não informado') candidateData.experience = extractedData.experience;
        if (extractedData.education && extractedData.education !== 'Não informado') candidateData.education = extractedData.education;
        candidateData.resume_url = `job-applications/${filePath}`;
        candidateData.resume_file_name = entry.file.name;

        const { error: insertError } = await supabase.from('candidates').insert(candidateData);
        if (insertError) throw insertError;

        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'done' } : f));
        success++;
      } catch (err: unknown) {
        const msg = (err as Error).message;
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', errorMessage: msg } : f));
        errors++;
      }
    }

    // Inserir tags na tabela global
    if (batchTags.length > 0 && profile?.organization_id) {
      for (const tag of batchTags) {
        supabase.from('tags').upsert({ name: tag, organization_id: profile.organization_id }, { onConflict: 'name,organization_id' }).then(() => {}, () => {});
      }
    }

    setSuccessCount(success);
    setErrorCount(errors);
    setDone(true);
    setProcessing(false);

    if (success > 0) {
      toast.success(`${success} candidato(s) adicionado(s) ao Pool!`);
      onSuccess();
    }
  }, [files, profile, batchTags, onSuccess]);

  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: isMobile ? '64px' : 0, left: 0, right: 0, bottom: 0,
    zIndex: 400,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
  };

  const cardStyle: React.CSSProperties = {
    position: 'fixed',
    top: isMobile ? '64px' : '50%',
    left: isMobile ? 0 : '50%',
    transform: isMobile ? 'none' : 'translate(-50%, -50%)',
    zIndex: 401,
    width: isMobile ? '100%' : 'clamp(420px, 48vw, 640px)',
    height: isMobile ? 'calc(100dvh - 64px)' : 'auto',
    maxHeight: isMobile ? 'calc(100dvh - 64px)' : '85vh',
    overflowY: 'auto',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: isMobile ? 0 : 20,
    fontFamily: 'Inter, sans-serif',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  };

  const headerStyle: React.CSSProperties = {
    padding: isMobile ? '16px' : '20px 24px 16px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky', top: 0,
    background: 'var(--bg-card)',
    borderRadius: isMobile ? 0 : '20px 20px 0 0',
    zIndex: 1,
  };

  const inputStyle: React.CSSProperties = {
    padding: isMobile ? '16px' : '20px 24px',
  };

  const fileRowIcon = (status: FileEntry['status']) => {
    switch (status) {
      case 'uploading': return <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />;
      case 'extracting': return <Loader size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />;
      case 'done': return <Check size={14} style={{ color: '#22c55e' }} />;
      case 'error': return <AlertCircle size={14} style={{ color: '#ef4444' }} />;
      default: return null;
    }
  };

  const fileRowBg = (status: FileEntry['status']) => {
    switch (status) {
      case 'done': return 'rgba(34,197,94,0.06)';
      case 'error': return 'rgba(239,68,68,0.06)';
      default: return 'var(--bg-main)';
    }
  };

  return (
    <>
      <div onClick={handleClose} style={overlayStyle} />
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={isMobile ? 16 : 18} style={{ color: 'var(--primary)' }} />
            {done ? 'Importação Concluída' : 'Importar Currículos'}
          </h2>
          <button onClick={handleClose} style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 10, padding: 8, cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        <div style={inputStyle}>
          {!done && !processing && (
            <>
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 16,
                  padding: '32px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginBottom: 16,
                  background: files.length ? 'rgba(59,130,246,0.04)' : 'transparent',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <Upload size={32} style={{ color: 'var(--text-dim)', marginBottom: 8 }} />
                <p style={{ color: 'var(--text-dim)', fontSize: 13, margin: '0 0 4px' }}>
                  Arraste PDFs aqui ou clique para selecionar
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '0 0 12px' }}>
                  PDF, máximo 100 arquivos
                </p>
                <label style={{
                  display: 'inline-block', padding: '8px 20px',
                  background: 'var(--primary)', color: '#fff',
                  borderRadius: 10, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                }}>
                  Selecionar Arquivos
                  <input type="file" accept=".pdf" multiple onChange={handleFileInput} style={{ display: 'none' }} />
                </label>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600, margin: '0 0 4px' }}>
                    {files.length} arquivo(s) selecionado(s):
                  </p>
                  {files.map((entry, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 10,
                      background: fileRowBg(entry.status),
                      fontSize: 13, color: 'var(--text-main)',
                    }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.file.name}
                      </span>
                      {entry.status === 'error' && entry.errorMessage && (
                        <span style={{ fontSize: 11, color: '#ef4444', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.errorMessage}
                        </span>
                      )}
                      <div style={{ flexShrink: 0 }}>{fileRowIcon(entry.status)}</div>
                      {entry.status === 'pending' && (
                        <button onClick={() => removeFile(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 2 }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Batch tags */}
              {files.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 4 }}>
                    Tags para marcar esses currículos (Enter pra adicionar):
                  </label>
                  <TagInput value={batchTags} onChange={setBatchTags} suggestions={tagSuggestions} placeholder="Ex: TI, Design, Sênior..." />
                </div>
              )}

              {/* Action buttons */}
              {files.length > 0 && (
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button onClick={handleClose} style={{
                    padding: '10px 20px', background: 'transparent',
                    border: '1px solid var(--border)', borderRadius: 12,
                    color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Cancelar
                  </button>
                  <button onClick={startProcessing} style={{
                    padding: '10px 24px',
                    background: 'var(--primary)',
                    border: 'none', borderRadius: 12,
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer',
                  }}>
                    Importar {files.length} candidato(s)
                  </button>
                </div>
              )}
            </>
          )}

          {/* Processing */}
          {processing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 14, color: 'var(--text-main)', margin: 0, fontWeight: 600 }}>
                Processando candidatos...
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {files.map((entry, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 10,
                    background: fileRowBg(entry.status),
                    fontSize: 13, color: 'var(--text-main)',
                  }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.file.name}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {entry.status === 'uploading' && 'Enviando...'}
                      {entry.status === 'extracting' && 'Extraindo...'}
                      {entry.status === 'done' && 'Concluído'}
                      {entry.status === 'error' && (entry.errorMessage || 'Erro')}
                    </span>
                    <div style={{ flexShrink: 0 }}>{fileRowIcon(entry.status)}</div>
                  </div>
                ))}
              </div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {/* Done */}
          {done && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(34,197,94,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Check size={28} style={{ color: '#22c55e' }} />
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)', margin: '0 0 4px' }}>
                Importação concluída!
              </p>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 24px' }}>
                {successCount} candidato(s) adicionado(s)
                {errorCount > 0 && `, ${errorCount} erro(s)`}
              </p>
              <button onClick={handleClose} style={{
                padding: '10px 24px',
                background: 'var(--primary)',
                border: 'none', borderRadius: 12,
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
              }}>
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
