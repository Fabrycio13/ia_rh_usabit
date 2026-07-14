import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../core/services/supabase';
import { useUser } from '../../../core/contexts/UserContext';
import { extractTextFromPDF, pdfToImages } from '../../../core/services/pdfExtractor';
import { extractCandidateData } from '../../../core/services/cvAnalyzer';
import { analyzeResume } from '../../../core/services/analyzers/resumeAnalyzer';
import { useLang } from '../../../core/contexts/LangContext';
import { X, Upload, Check, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ResumeAnalysis } from '../../../core/services/ai/types';

interface PoolAddCandidateProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'review' | 'analyzed';

interface FormData {
  name: string;
  email: string;
  phone: string;
  location: string;
  age: string;
  gender: string;
  linkedin: string;
  portfolio: string;
  skills: string;
  experience: string;
  education: string;
}

const INITIAL_FORM: FormData = {
  name: '',
  email: '',
  phone: '',
  location: '',
  age: '',
  gender: '',
  linkedin: '',
  portfolio: '',
  skills: '',
  experience: '',
  education: ''
};

export const PoolAddCandidate = ({ isOpen, onClose, onSuccess }: PoolAddCandidateProps) => {
  const { profile } = useUser();
  const { lang, t } = useLang();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const check = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    check(mq);
    mq.addEventListener('change', check);
    return () => mq.removeEventListener('change', check);
  }, []);
  const [step, setStep] = useState<Step>('upload');
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'extracting' | 'success' | 'error'>('idle');
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string>('');
  const [resumeFileName, setResumeFileName] = useState<string>('');
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [fullAnalysis, setFullAnalysis] = useState<ResumeAnalysis | null>(null);

  const resetForm = useCallback(() => {
    setStep('upload');
    setUploadState('idle');
    setAnalyzing(false);
    setSubmitting(false);
    setResumeFile(null);
    setResumeUrl('');
    setResumeFileName('');
    setFormData(INITIAL_FORM);
    setFullAnalysis(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!profile?.organization_id) return;
    if (file.type !== 'application/pdf') {
      toast.error(t('apenasPDF'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('max10MB'));
      return;
    }

    setUploadState('uploading');
    setResumeFile(file);
    setResumeFileName(file.name);

    try {
      const uuid = crypto.randomUUID().substring(0, 8);
      const filePath = `resumes/manual/${profile.organization_id}/${Date.now()}_${uuid}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('job-applications')
        .upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: 'application/pdf' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('job-applications')
        .getPublicUrl(filePath);

      setResumeUrl(publicUrl);
      setUploadState('extracting');

      const text = await extractTextFromPDF(file);
      let images: string[] | undefined;

      if (!text || text.length < 80) {
        images = await pdfToImages(file);
      }

      const extraction = await extractCandidateData(text, images, lang);

      setFormData({
        name: extraction.name && extraction.name !== 'Não identificado' ? extraction.name : '',
        email: extraction.email || '',
        phone: extraction.phone || '',
        location: extraction.location || '',
        age: extraction.age || '',
        gender: extraction.gender && extraction.gender !== 'Não identificado' ? extraction.gender : '',
        linkedin: extraction.linkedin || '',
        portfolio: extraction.portfolio || '',
        skills: extraction.skills.length > 0 ? extraction.skills.join(', ') : '',
        experience: extraction.experience && extraction.experience !== 'Não informado' ? extraction.experience : '',
        education: extraction.education && extraction.education !== 'Não informado' ? extraction.education : ''
      });

      setUploadState('success');
      setStep('review');
      toast.success(t('dadosExtraidosSucesso'));
    } catch (err: unknown) {
      console.error('[PoolAddCandidate] Erro no upload/extração:', err);
      toast.error(`${t('erroProcessarCurriculo')} ${(err as Error).message}`);
      setUploadState('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.organization_id]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleFieldChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const hasDuplicate = useCallback(async (): Promise<boolean> => {
    if (!formData.email || !profile?.organization_id) return false;
    const { data } = await supabase
      .from('candidates')
      .select('id')
      .eq('email', formData.email)
      .eq('organization_id', profile.organization_id)
      .maybeSingle();
    if (data) {
      toast.error(t('candidatoDuplicadoEmail'));
      return true;
    }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.email, profile?.organization_id]);

  const handleAnalyze = useCallback(async () => {
    if (!resumeFile) {
      toast.error(t('nenhumArquivo'));
      return;
    }
    setAnalyzing(true);
    try {
      const result = await analyzeResume(resumeFile, lang);
      setFullAnalysis(result);
      setStep('analyzed');
      toast.success(t('analiseConcluida'));
    } catch (err: unknown) {
      console.error('[PoolAddCandidate] Erro na análise:', err);
      toast.error(`${t('erroNaAnalise')} ${(err as Error).message}`);
    } finally {
      setAnalyzing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeFile]);

  const handleSave = useCallback(async () => {
    if (!profile?.organization_id || !profile?.userId) {
      toast.error(t('usuarioNaoAutenticado'));
      return;
    }
    if (!formData.name.trim()) {
      toast.error(t('nomeObrigatorio'));
      return;
    }

    const isDup = await hasDuplicate();
    if (isDup) return;

    setSubmitting(true);
    try {
      const analysisPayload: Record<string, unknown> = {
        source: 'manual_add',
        score: fullAnalysis?.score ?? 0,
        classification: fullAnalysis?.classification ?? '',
        skills: fullAnalysis?.skills ?? [],
        experience: fullAnalysis?.experience ?? '',
        education: fullAnalysis?.education ?? '',
        summary: fullAnalysis?.summary ?? '',
        strengths: fullAnalysis?.strengths ?? [],
        gaps: fullAnalysis?.gaps ?? [],
        suggested_areas: fullAnalysis?.suggested_areas ?? [],
        history: [{
          type: 'manual_add',
          date: new Date().toISOString(),
          summary: fullAnalysis?.summary ?? null,
          skills: fullAnalysis?.skills?.join(', ') ?? null,
          experience: fullAnalysis?.experience ?? null,
          education: fullAnalysis?.education ?? null,
          strengths: fullAnalysis?.strengths?.join(', ') ?? null,
          gaps: fullAnalysis?.gaps?.join(', ') ?? null
        }]
      };

      const candidateData: Record<string, unknown> = {
        name: formData.name.trim(),
        organization_id: profile.organization_id,
        user_id: profile.userId,
        status: 'pending',
        analysis: analysisPayload,
        source: 'manual_add'
      };

      if (formData.email.trim()) candidateData.email = formData.email.trim();
      if (formData.phone.trim()) candidateData.phone = formData.phone.trim();
      if (formData.location.trim()) candidateData.location = formData.location.trim();
      if (formData.age.trim()) candidateData.age = formData.age.trim();
      if (formData.gender.trim()) candidateData.gender = formData.gender.trim();
      if (formData.linkedin.trim()) candidateData.linkedin = formData.linkedin.trim();
      if (formData.portfolio.trim()) candidateData.portfolio = formData.portfolio.trim();
      if (formData.skills.trim()) candidateData.skills = formData.skills.trim();
      if (formData.experience.trim()) candidateData.experience = formData.experience.trim();
      if (formData.education.trim()) candidateData.education = formData.education.trim();
      if (resumeUrl) candidateData.resume_url = resumeUrl;
      if (resumeFileName) candidateData.resume_file_name = resumeFileName;

      const { error: insertError } = await supabase
        .from('candidates')
        .insert(candidateData);

      if (insertError) throw insertError;

      toast.success(t('candidatoAdicionadoPool'));
      resetForm();
      onSuccess();
    } catch (err: unknown) {
      console.error('[PoolAddCandidate] Erro ao salvar:', err);
      toast.error(`${t('erroSalvarCandidato')} ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, formData, fullAnalysis, resumeUrl, resumeFileName, hasDuplicate, resetForm, onSuccess]);

  if (!isOpen) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 12px',
    color: 'var(--text-main)',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-dim)',
    marginBottom: 4,
    display: 'block'
  };

  return (
    <>
      <div onClick={handleClose} style={{ position: 'fixed', top: isMobile ? '64px' : 0, left: 0, right: 0, bottom: 0, zIndex: 400, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed',
        top: isMobile ? '64px' : '50%', left: isMobile ? 0 : '50%', transform: isMobile ? 'none' : 'translate(-50%, -50%)',
        zIndex: 401,
        width: isMobile ? '100%' : 'clamp(450px, 50vw, 700px)',
        height: isMobile ? 'calc(100dvh - 64px)' : 'auto',
        maxHeight: isMobile ? 'calc(100dvh - 64px)' : '90vh',
        overflowY: 'auto',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: isMobile ? 0 : 20, fontFamily: 'Inter, sans-serif',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        <div style={{ padding: isMobile ? '16px' : '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--bg-card)', borderRadius: isMobile ? 0 : '20px 20px 0 0', zIndex: 1 }}>
          <h2 style={{ margin: 0, fontSize: isMobile ? 16 : 18, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={isMobile ? 16 : 18} style={{ color: 'var(--primary)' }} />
            {t('adicionarCandidatoTitulo')}
          </h2>
          <button onClick={handleClose} style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 10, padding: 8, cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: isMobile ? '16px' : '20px 24px' }}>
          {step === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              style={{
                border: '2px dashed var(--border)',
                borderRadius: 16,
                padding: '40px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: uploadState === 'uploading' || uploadState === 'extracting' ? 'var(--bg-main)' : 'transparent'
              }}
              onMouseEnter={e => { if (uploadState === 'idle') e.currentTarget.style.borderColor = 'var(--primary)'; }}
              onMouseLeave={e => { if (uploadState === 'idle') e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              {uploadState === 'idle' && (
                <>
                  <Upload size={40} style={{ color: 'var(--text-dim)', marginBottom: 12 }} />
                  <p style={{ color: 'var(--text-dim)', fontSize: 14, margin: '0 0 4px' }}>
                    {t('arrasteArquivos')}
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 16px' }}>
                    {t('formatosAceitos')}
                  </p>
                  <label style={{
                    display: 'inline-block', padding: '10px 24px',
                    background: 'var(--primary)', color: '#fff',
                    borderRadius: 10, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer'
                  }}>
                    {t('selecionarArquivo')}
                    <input type="file" accept=".pdf" onChange={handleFileInput} style={{ display: 'none' }} />
                  </label>
                </>
              )}
              {(uploadState === 'uploading' || uploadState === 'extracting') && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
                  <p style={{ color: 'var(--text-dim)', fontSize: 14, margin: 0 }}>
                    {uploadState === 'uploading' ? t('enviandoCurriculo') : t('extraindoDados')}
                  </p>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              )}
              {uploadState === 'error' && (
                <div>
                  <p style={{ color: '#ef4444', fontSize: 14, margin: '0 0 12px' }}>{t('erroProcessarArquivo')}</p>
                  <button onClick={() => setUploadState('idle')} style={{
                    padding: '8px 20px', background: 'var(--primary)', color: '#fff',
                    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer'
                  }}>
                    {t('tentarNovamente')}
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)' }}>
                <Check size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--text-main)' }}>
                  {t('curriculoProcessado')}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>{t('fullName')} *</label>
                  <input style={inputStyle} value={formData.name} onChange={e => handleFieldChange('name', e.target.value)} placeholder={t('exNome')} />
                </div>
                <div>
                  <label style={labelStyle}>{t('email')}</label>
                  <input style={inputStyle} value={formData.email} onChange={e => handleFieldChange('email', e.target.value)} placeholder={t('exEmail')} />
                </div>
                <div>
                  <label style={labelStyle}>{t('phone')}</label>
                  <input style={inputStyle} value={formData.phone} onChange={e => handleFieldChange('phone', e.target.value)} placeholder={t('exTelefone')} />
                </div>
                <div>
                  <label style={labelStyle}>{t('idade')}</label>
                  <input style={inputStyle} value={formData.age} onChange={e => handleFieldChange('age', e.target.value)} placeholder={t('exIdade')} />
                </div>
                <div>
                  <label style={labelStyle}>{t('genero')}</label>
                  <input style={inputStyle} value={formData.gender} onChange={e => handleFieldChange('gender', e.target.value)} placeholder={t('exGenero')} />
                </div>
                <div>
                  <label style={labelStyle}>{t('localizacao')}</label>
                  <input style={inputStyle} value={formData.location} onChange={e => handleFieldChange('location', e.target.value)} placeholder={t('exLocalizacao')} />
                </div>
                <div>
                  <label style={labelStyle}>{t('linkedin')}</label>
                  <input style={inputStyle} value={formData.linkedin} onChange={e => handleFieldChange('linkedin', e.target.value)} placeholder={t('exLinkedin')} />
                </div>
                <div>
                  <label style={labelStyle}>{t('portfolio')}</label>
                  <input style={inputStyle} value={formData.portfolio} onChange={e => handleFieldChange('portfolio', e.target.value)} placeholder={t('exPortfolio')} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>{t('habilidades')}</label>
                <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={formData.skills} onChange={e => handleFieldChange('skills', e.target.value)} placeholder={t('exHabilidades')} />
              </div>
              <div>
                <label style={labelStyle}>{t('experiencia')}</label>
                <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={formData.experience} onChange={e => handleFieldChange('experience', e.target.value)} placeholder={t('exExperiencia')} />
              </div>
              <div>
                <label style={labelStyle}>{t('educacao')}</label>
                <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={formData.education} onChange={e => handleFieldChange('education', e.target.value)} placeholder={t('exEducacao')} />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <button onClick={handleClose} style={{
                  padding: '10px 20px', background: 'transparent',
                  border: '1px solid var(--border)', borderRadius: 12,
                  color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}>
                  {t('cancelar')}
                </button>
                <button onClick={handleAnalyze} disabled={analyzing} style={{
                  padding: '10px 24px',
                  background: analyzing ? 'var(--border)' : 'var(--primary)',
                  border: 'none', borderRadius: 12,
                  color: analyzing ? 'var(--text-dim)' : '#fff',
                  fontSize: 13, fontWeight: 700,
                  cursor: analyzing ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  {analyzing ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('analisando')}</> : <>{t('analisarCurriculo')}</>}
                </button>
              </div>
            </div>
          )}

          {step === 'analyzed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(34,197,94,0.08)', borderRadius: 10, border: '1px solid rgba(34,197,94,0.2)' }}>
                <Check size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--text-main)' }}>
                  {t('analiseConcluidaRevise')}
                </span>
              </div>

              {fullAnalysis && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                  <div style={{
                    flex: '0 0 110px',
                    padding: '20px 16px',
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(34,197,94,0.05) 100%)',
                    borderRadius: 14,
                    textAlign: 'center',
                    border: '1px solid rgba(34,197,94,0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '0 0 6px', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Score</p>
                    <p style={{
                      fontSize: 36,
                      fontWeight: 800,
                      color: fullAnalysis.score >= 70 ? '#22c55e' : fullAnalysis.score >= 40 ? '#f59e0b' : '#ef4444',
                      margin: 0,
                      lineHeight: 1
                    }}>{fullAnalysis.score}</p>
                  </div>
                  {fullAnalysis?.summary && (
                    <div style={{
                      flex: 1,
                      padding: '14px 16px',
                      background: 'var(--bg-main)',
                      borderRadius: 14,
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', margin: '0 0 8px', letterSpacing: 0.5, textTransform: 'uppercase' }}>Resumo</p>
                      <p style={{ fontSize: 13, color: 'var(--text-main)', margin: 0, lineHeight: 1.6 }}>{fullAnalysis.summary}</p>
                    </div>
                  )}
                </div>
              )}

              {fullAnalysis && (fullAnalysis.strengths?.length > 0 || fullAnalysis.gaps?.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {fullAnalysis.strengths?.length > 0 && (
                    <div style={{ padding: '12px 14px', background: 'rgba(34,197,94,0.06)', borderRadius: 12, border: '1px solid rgba(34,197,94,0.15)' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', margin: '0 0 8px' }}>Pontos Fortes</p>
                      {fullAnalysis.strengths.map((s, i) => (
                        <p key={i} style={{ fontSize: 13, color: '#22c55e', margin: '0 0 4px', paddingLeft: 14, position: 'relative', lineHeight: 1.5 }}>
                          <span style={{ position: 'absolute', left: 0, top: 0 }}>–</span> {s}
                        </p>
                      ))}
                    </div>
                  )}
                  {fullAnalysis.gaps?.length > 0 && (
                    <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.06)', borderRadius: 12, border: '1px solid rgba(239,68,68,0.15)' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', margin: '0 0 8px' }}>Gaps</p>
                      {fullAnalysis.gaps.map((g, i) => (
                        <p key={i} style={{ fontSize: 13, color: '#ef4444', margin: '0 0 4px', paddingLeft: 14, position: 'relative', lineHeight: 1.5 }}>
                          <span style={{ position: 'absolute', left: 0, top: 0 }}>–</span> {g}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <button onClick={() => setStep('review')} style={{
                  padding: '10px 20px', background: 'transparent',
                  border: '1px solid var(--border)', borderRadius: 12,
                  color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}>
                  {t('voltar')}
                </button>

                <button onClick={handleSave} disabled={submitting} style={{
                  padding: '10px 24px',
                  background: submitting ? 'var(--border)' : 'var(--primary)',
                  border: 'none', borderRadius: 12,
                  color: submitting ? 'var(--text-dim)' : '#fff',
                  fontSize: 13, fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  {submitting ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('saving')}</> : <>{t('confirmarAdicionarPool')}</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
