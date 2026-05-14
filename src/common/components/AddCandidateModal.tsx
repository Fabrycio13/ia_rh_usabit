import { useState, type FormEvent, useCallback, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { supabase } from '../../core/services/supabase';
import { useUser } from '../../core/contexts/UserContext';
import { extractCandidateData } from '../../core/services/cvAnalyzer';
import { Upload, FileText, Loader2, X, Check, AlertCircle, FileSpreadsheet, File, Mail, Phone, MapPin, Calendar, User, Briefcase, GraduationCap, Sparkles, StickyNote, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

interface AddCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onViewCandidate?: (candidateId: string) => void;
}

interface FormErrors {
  name?: string;
  email?: string;
}

type UploadState = 'idle' | 'uploading' | 'analyzing' | 'success' | 'error';

interface DuplicateCandidate {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
}

export const AddCandidateModal = ({ isOpen, onClose, onSuccess, onViewCandidate }: AddCandidateModalProps) => {
  const { profile } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [duplicateCandidate, setDuplicateCandidate] = useState<DuplicateCandidate | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [education, setEducation] = useState('');
  const [notes, setNotes] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const validate = (): boolean => {
    const errors: FormErrors = {};

    if (!name.trim()) {
      errors.name = 'Nome é obrigatório';
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.email = 'E-mail inválido';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setLocation('');
    setAddress('');
    setAge('');
    setGender('');
    setSkills('');
    setExperience('');
    setEducation('');
    setNotes('');
    setResumeUrl('');
    setLinkedin('');
    setPortfolio('');
    setUploadedFileName(null);
    setFormErrors({});
    setError(null);
    setUploadState('idle');
    setUploadProgress(0);
  };

  const handleFileUpload = useCallback(async (file: File) => {
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
      toast.error('Apenas PDF, Word (.doc/.docx) e Excel (.xls/.xlsx) são suportados');
      return;
    }

    setUploadState('uploading');
    setUploadProgress(0);
    setUploadedFileName(file.name);

    try {
      // Step 1: Upload file to Supabase Storage
      setUploadProgress(20);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt.substring(1)}`;
      const filePath = `resumes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(40);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      const publicResumeUrl = urlData.publicUrl;
      setUploadProgress(50);

      // Step 2: Extract text based on file type
      setUploadState('analyzing');
      setUploadProgress(60);

      let extractedText = '';

      if (fileExt === '.pdf') {
        // Extract from PDF
        const pdfjsLib = await import('pdfjs-dist');
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = (textContent.items as Array<{ str?: string }>)
            .filter((item) => item.str)
            .map((item) => item.str as string)
            .join(' ');
          extractedText += pageText + '\n';
        }
      } else if (fileExt === '.doc' || fileExt === '.docx') {
        // Extract from Word
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
        
        if (result.messages.length > 0) {
          console.warn('Mammoth warnings:', result.messages);
        }
      } else if (fileExt === '.xls' || fileExt === '.xlsx') {
        // Extract from Excel
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet) as Record<string, unknown>[];
        
        // Convert all rows to text
        extractedText = data.map(row => 
          Object.entries(row)
            .map(([key, value]) => `${key}: ${value}`)
            .join('\n')
        ).join('\n\n');
      }

      if (!extractedText || extractedText.trim().length < 50) {
        throw new Error('Não foi possível extrair texto suficiente do arquivo. Verifique se o arquivo está legível.');
      }

      setUploadProgress(75);

      // Extrair dados com a função dedicada (sem scoring)
      const extractionResult = await extractCandidateData(extractedText);

      setUploadProgress(90);

      // Log do resultado para debug
      console.log('[AddCandidate] Extraction Result:', {
        name: extractionResult.name,
        skills: extractionResult.skills,
        skillsIsArray: Array.isArray(extractionResult.skills),
        skillsLength: extractionResult.skills?.length || 0,
        experience: extractionResult.experience,
        education: extractionResult.education,
        email: extractionResult.email,
        phone: extractionResult.phone,
        location: extractionResult.location,
        age: extractionResult.age,
      });

      // Auto-fill form com dados extraídos
      if (extractionResult.name && extractionResult.name !== 'Não identificado') {
        setName(extractionResult.name);
      }
      if (extractionResult.email) {
        setEmail(extractionResult.email);
      }
      if (extractionResult.phone) {
        setPhone(extractionResult.phone);
      }
      if (extractionResult.location && extractionResult.location !== 'Cidade Não Informada') {
        setLocation(extractionResult.location);
      }
      if (extractionResult.age) {
        setAge(extractionResult.age.toString());
      }
      if (extractionResult.gender && extractionResult.gender !== 'Não identificado') {
        setGender(extractionResult.gender);
      }
      
      // Skills: vem como array
      if (extractionResult.skills && extractionResult.skills.length > 0) {
        const skillsText = extractionResult.skills.join(', ');
        const normalized = normalizeAIResult(skillsText, 'skills');
        console.log('[AddCandidate] Skills normalized:', normalized);
        setSkills(normalized);
      }
      
      if (extractionResult.experience && extractionResult.experience !== 'Não informado') {
        setExperience(normalizeAIResult(extractionResult.experience, 'experience'));
      }
      if (extractionResult.education && extractionResult.education !== 'Não informado') {
        setEducation(normalizeAIResult(extractionResult.education, 'education'));
      }

      // Set the resume URL for saving later
      setResumeUrl(publicResumeUrl);
      setUploadProgress(100);
      setUploadState('success');
      toast.success('Currículo analisado com sucesso! Dados preenchidos automaticamente.');
    } catch (err) {
      console.error('Error processing CV:', err);
      const message = err instanceof Error ? err.message : 'Erro ao processar currículo';
      setError(message);
      setUploadState('error');
      toast.error(`Erro: ${message}`);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  }, [handleFileUpload]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setLoading(true);

    try {
      const candidateData: Record<string, unknown> = {
        user_id: profile.userId,
        organization_id: profile.organization_id,
        name: name.trim(),
        analysis: {
          skills: skills.trim(),
          experience: experience.trim(),
          education: education.trim(),
          history: []
        }
      };

      if (email.trim()) candidateData.email = email.trim();
      if (phone.trim()) candidateData.phone = phone.trim();
      if (location.trim()) candidateData.location = location.trim();
      if (address.trim()) candidateData.address = address.trim();
      if (age.trim()) candidateData.age = parseInt(age.trim(), 10);
      if (gender.trim()) candidateData.gender = gender.trim();
      if (skills.trim()) candidateData.skills = skills.trim();
      if (experience.trim()) candidateData.experience = experience.trim();
      if (education.trim()) candidateData.education = education.trim();
      if (notes.trim()) candidateData.notes = notes.trim();
      if (resumeUrl.trim()) candidateData.resume_url = resumeUrl.trim();
      if (linkedin.trim()) candidateData.linkedin = linkedin.trim();
      if (portfolio.trim()) candidateData.portfolio = portfolio.trim();

      const { error: insertError } = await supabase
        .from('candidates')
        .insert(candidateData);

      if (insertError) throw insertError;

      resetForm();
      onSuccess();
      onClose();
      toast.success('Candidato adicionado com sucesso!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar candidato';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verifica se já existe candidato com mesmo email ou telefone no banco
   */
  const checkDuplicate = async () => {
    if (!profile.userId) return;

    const queries = [];
    if (email.trim()) {
      queries.push(
        supabase
          .from('candidates')
          .select('id, name, email, phone, location')
          .eq('user_id', profile.userId)
          .eq('email', email.trim())
          .maybeSingle()
      );
    }
    if (phone.trim()) {
      queries.push(
        supabase
          .from('candidates')
          .select('id, name, email, phone, location')
          .eq('user_id', profile.userId)
          .eq('phone', phone.trim())
          .maybeSingle()
      );
    }

    if (queries.length === 0) return;

    const results = await Promise.all(queries);
    
    for (const { data } of results) {
      if (data) {
        setDuplicateCandidate(data as DuplicateCandidate);
        return;
      }
    }

    setDuplicateCandidate(null);
  };

  const handleClose = () => {
    if (!loading && uploadState !== 'uploading' && uploadState !== 'analyzing') {
      resetForm();
      onClose();
    }
  };

  const clearUpload = () => {
    setUploadState('idle');
    setUploadedFileName(null);
    setResumeUrl('');
    setUploadProgress(0);
    setError(null);
  };

  const hasAnyData = name || email || phone || location || age || skills || experience || education;

  /**
   * Reseta o formulário sempre que o modal for aberto
   */
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  /**
   * Verifica duplicidade quando email ou telefone mudam
   */
  useEffect(() => {
    if (email.trim() || phone.trim()) {
      const timer = setTimeout(() => {
        checkDuplicate();
      }, 500); // Debounce de 500ms
      
      return () => clearTimeout(timer);
    } else {
      setDuplicateCandidate(null);
    }
  }, [email, phone, profile.userId]);

  /**
   * Normaliza dados extraídos pela IA para formato consistente
   * O prompt da IA já garante formatos rígidos, isso é apenas cleanup extra
   */
  const normalizeAIResult = (raw: string | undefined | null, type: 'skills' | 'experience' | 'education'): string => {
    if (!raw || raw === 'não informado' || raw === 'Não informado') return '';

    if (type === 'skills') {
      // Skills já vem como array do prompt, mas se vier string, limpa
      if (typeof raw === 'string') {
        return raw
          .replace(/[•*●\-]\s*/g, '')  // Remove bullets
          .replace(/\d+[.)-]\s*/g, '')  // Remove numeração
          .trim();
      }
      return String(raw);
    }

    if (type === 'experience') {
      // Experience já vem no formato "X anos e Y meses", só limpa
      return String(raw)
        .replace(/\n+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

    if (type === 'education') {
      // Education já vem com " | ", só limpa
      return String(raw)
        .replace(/\n+/g, ' | ')
        .replace(/\s*\|\s*\|\s*/g, ' | ')
        .trim();
    }

    return String(raw);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Adicionar Candidato">
      <div style={{
        overflowY: 'auto',
        maxHeight: 'calc(90vh - 120px)',
        padding: '0 8px',
        marginRight: '-8px',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.15) transparent',
      }}>
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
          padding: '4px 0 24px 0',
        }}>

          {/* Error Banner */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <AlertCircle style={{ width: 16, height: 16, color: '#ef4444', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#ef4444' }}>{error}</span>
            </div>
          )}

          {/* Duplicate Warning Banner */}
          {duplicateCandidate && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <AlertCircle style={{ width: 18, height: 18, color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>
                    ⚠️ Candidato já cadastrado
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-main)', marginBottom: 4 }}>
                    <strong>{duplicateCandidate.name}</strong>
                    {duplicateCandidate.email && <span style={{ color: 'var(--text-dim)' }}> • {duplicateCandidate.email}</span>}
                  </p>
                  {duplicateCandidate.phone && <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 2 }}>Telefone: {duplicateCandidate.phone}</p>}
                  {duplicateCandidate.location && <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Localização: {duplicateCandidate.location}</p>}
                  <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
                    Não é possível salvar um candidato duplicado. Clique abaixo para visualizar o cadastro existente.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (onViewCandidate) {
                        onViewCandidate(duplicateCandidate.id);
                      }
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: 8,
                      padding: '8px 16px',
                      color: '#ef4444',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                    }}
                  >
                    <Eye style={{ width: 14, height: 14 }} />
                    Visualizar Candidato Existente
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Upload Section */}
          <section style={{
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 14,
            }}>
              <Upload style={{ width: 14, height: 14, color: 'var(--text-dim)' }} />
              <p style={{
                fontSize: 11,
                color: 'var(--text-dim)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: 0,
              }}>
                Upload de Currículo
              </p>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={handleDrop}
              style={{
                background: uploadState === 'success' ? 'rgba(34, 197, 94, 0.05)' : uploadState === 'error' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255,255,255,0.03)',
                border: `2px dashed ${uploadState === 'success' ? 'rgba(34, 197, 94, 0.4)' : uploadState === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'var(--border)'}`,
                borderRadius: 14,
                padding: 24,
                textAlign: 'center',
                transition: 'all 0.2s',
              }}
            >
              {uploadState === 'idle' && (
                <>
                  <Upload style={{ width: 36, height: 36, color: 'var(--primary)', marginBottom: 12 }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
                    Envie o currículo
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
                    PDF, Word ou Excel — a IA extrai os dados automaticamente
                  </p>
                  <div style={{
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    marginBottom: 12,
                  }}>
                    <label style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      padding: '10px 16px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                    }}>
                      <FileText style={{ width: 14, height: 14 }} />
                      PDF
                      <input type="file" accept=".pdf" onChange={handleFileInput} style={{ display: 'none' }} />
                    </label>
                    <label style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      color: '#60a5fa',
                      padding: '10px 16px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.12)';
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                    }}>
                      <File style={{ width: 14, height: 14 }} />
                      Word
                      <input type="file" accept=".doc,.docx" onChange={handleFileInput} style={{ display: 'none' }} />
                    </label>
                    <label style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(34, 197, 94, 0.08)',
                      border: '1px solid rgba(34, 197, 94, 0.2)',
                      color: '#22c55e',
                      padding: '10px 16px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(34, 197, 94, 0.12)';
                      e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(34, 197, 94, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.2)';
                    }}>
                      <FileSpreadsheet style={{ width: 14, height: 14 }} />
                      Excel
                      <input type="file" accept=".xls,.xlsx" onChange={handleFileInput} style={{ display: 'none' }} />
                    </label>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    ou arraste e solte o arquivo aqui
                  </p>
                </>
              )}

              {uploadState === 'uploading' && (
                <div>
                  <Loader2 style={{ width: 36, height: 36, color: 'var(--primary)', marginBottom: 12, animation: 'acm-spin 1s linear infinite' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', marginBottom: 8 }}>
                    Enviando currículo...
                  </p>
                  <div style={{
                    background: 'var(--bg-main)',
                    borderRadius: 999,
                    height: 6,
                    width: '100%',
                    maxWidth: 300,
                    margin: '0 auto',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      background: 'var(--primary)',
                      height: '100%',
                      width: `${uploadProgress}%`,
                      transition: 'width 0.3s',
                      borderRadius: 999,
                    }} />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
                    {uploadedFileName}
                  </p>
                </div>
              )}

              {uploadState === 'analyzing' && (
                <div>
                  <Loader2 style={{ width: 36, height: 36, color: 'var(--primary)', marginBottom: 12, animation: 'acm-spin 1s linear infinite' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
                    IA analisando currículo...
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    Extraindo dados do candidato
                  </p>
                </div>
              )}

              {uploadState === 'success' && (
                <div>
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    boxShadow: '0 8px 16px rgba(34, 197, 94, 0.25)',
                  }}>
                    <Check style={{ width: 28, height: 28, color: '#fff' }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#22c55e', marginBottom: 6 }}>
                    Análise concluída!
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>
                    {uploadedFileName}
                  </p>
                  <button
                    type="button"
                    onClick={clearUpload}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '8px 18px',
                      color: 'var(--text-main)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    Enviar outro currículo
                  </button>
                </div>
              )}

              {uploadState === 'error' && (
                <div>
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}>
                    <X style={{ width: 28, height: 28, color: '#ef4444' }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>
                    Erro na análise
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>
                    {uploadedFileName}
                  </p>
                  <button
                    type="button"
                    onClick={clearUpload}
                    style={{
                      background: 'var(--primary)',
                      border: '1px solid var(--primary)',
                      borderRadius: 10,
                      padding: '8px 18px',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 8px 16px rgba(59, 130, 246, 0.2)',
                    }}
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Contact Info Section */}
          {hasAnyData && (
            <section style={{
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
              }}>
                <User style={{ width: 14, height: 14, color: 'var(--text-dim)' }} />
                <p style={{
                  fontSize: 11,
                  color: 'var(--text-dim)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: 0,
                }}>
                  Informações do Candidato
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 12,
              }}>
                {/* Name Card */}
                <div style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  gridColumn: '1 / -1',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <User style={{ width: 12, height: 12, color: 'var(--text-dim)' }} />
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Nome *</span>
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome completo do candidato"
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      padding: 0,
                      fontFamily: 'inherit',
                    }}
                    required
                  />
                  {formErrors.name && (
                    <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{formErrors.name}</p>
                  )}
                </div>

                {/* Email Card */}
                <div style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Mail style={{ width: 12, height: 12, color: 'var(--text-dim)' }} />
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>E-mail</span>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      padding: 0,
                      fontFamily: 'inherit',
                    }}
                  />
                  {formErrors.email && (
                    <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{formErrors.email}</p>
                  )}
                </div>

                {/* Phone Card */}
                <div style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Phone style={{ width: 12, height: 12, color: 'var(--text-dim)' }} />
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Telefone</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      padding: 0,
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Location Card */}
                <div style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <MapPin style={{ width: 12, height: 12, color: 'var(--text-dim)' }} />
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Localização</span>
                  </div>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Cidade, Estado"
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      padding: 0,
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Age Card */}
                <div style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Calendar style={{ width: 12, height: 12, color: 'var(--text-dim)' }} />
                    <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Idade</span>
                  </div>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="00"
                    min="0"
                    max="150"
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      padding: 0,
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Professional Info Section */}
          <section style={{
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 14,
            }}>
              <Briefcase style={{ width: 14, height: 14, color: 'var(--text-dim)' }} />
              <p style={{
                fontSize: 11,
                color: 'var(--text-dim)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: 0,
              }}>
                Perfil Profissional
              </p>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              {/* Skills */}
              <div style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '16px 18px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Sparkles style={{ width: 14, height: 14, color: 'var(--text-dim)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Habilidades</span>
                </div>
                <textarea
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="Separe as habilidades por vírgula (ex: JavaScript, React, Node.js)"
                  rows={3}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 13,
                    color: 'var(--text-main)',
                    padding: 0,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    lineHeight: 1.6,
                  }}
                />
              </div>

              {/* Experience */}
              <div style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '16px 18px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Briefcase style={{ width: 14, height: 14, color: 'var(--text-dim)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Experiência</span>
                </div>
                <textarea
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="Resumo da experiência profissional"
                  rows={3}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 13,
                    color: 'var(--text-main)',
                    padding: 0,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    lineHeight: 1.6,
                  }}
                />
              </div>

              {/* Education */}
              <div style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '16px 18px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <GraduationCap style={{ width: 14, height: 14, color: 'var(--text-dim)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Formação</span>
                </div>
                <textarea
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="Formação acadêmica e cursos relevantes"
                  rows={3}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 13,
                    color: 'var(--text-main)',
                    padding: 0,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    lineHeight: 1.6,
                  }}
                />
              </div>

              {/* Notes */}
              <div style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 2,
              }}>
                <StickyNote style={{ width: 14, height: 14, color: 'var(--text-dim)' }} />
                <p style={{
                  fontSize: 11,
                  color: 'var(--text-dim)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: 0,
                }}>
                  Anotações Internas
                </p>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '16px 18px',
                transition: 'all 0.2s',
              }}>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anotações adicionais sobre o candidato"
                  rows={2}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 13,
                    color: 'var(--text-main)',
                    padding: 0,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    lineHeight: 1.6,
                  }}
                />
              </div>
            </div>
          </section>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            paddingTop: 8,
            borderTop: '1px solid var(--border)',
          }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading || uploadState === 'uploading' || uploadState === 'analyzing'}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '10px 24px',
                color: 'var(--text-main)',
                fontSize: 13,
                fontWeight: 700,
                cursor: loading || uploadState === 'uploading' || uploadState === 'analyzing' ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: loading || uploadState === 'uploading' || uploadState === 'analyzing' ? 0.5 : 1,
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || uploadState === 'uploading' || uploadState === 'analyzing' || !!duplicateCandidate}
              style={{
                background: duplicateCandidate ? 'var(--text-muted)' : 'var(--primary)',
                border: `1px solid ${duplicateCandidate ? 'var(--border)' : 'var(--primary)'}`,
                borderRadius: 12,
                padding: '10px 28px',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: loading || uploadState === 'uploading' || uploadState === 'analyzing' || duplicateCandidate ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: duplicateCandidate ? 'none' : '0 8px 16px rgba(59, 130, 246, 0.25)',
                opacity: loading || uploadState === 'uploading' || uploadState === 'analyzing' || duplicateCandidate ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              title={duplicateCandidate ? 'Candidato duplicado - não é possível salvar' : ''}
            >
              {loading && <Loader2 style={{ width: 14, height: 14, animation: 'acm-spin 1s linear infinite' }} />}
              {loading ? 'Salvando...' : (uploadState === 'success' ? 'Salvar Candidato' : 'Adicionar Candidato')}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes acm-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Modal>
  );
};
