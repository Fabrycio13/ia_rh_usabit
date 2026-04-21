import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import toast from 'react-hot-toast';
import {
    ArrowLeft, User, Mail, Phone, Linkedin, MapPin, Upload, FileText,
    CheckCircle, AlertCircle, ArrowRight, Sparkles, Heart, ChevronDown
} from 'lucide-react';
import { analyzeJobApplication, type JobMatchResult } from '../../core/services/jobAnalyzer';

interface Job {
    id: string;
    title: string;
    company_name: string | null;
    description?: string | null;
    responsibilities?: string | null;
    requirements?: string | null;
    differentials?: string | null;
    additional_info?: string | null;
    has_location: boolean;
    location: string | null;
    work_model: string | null;
    custom_questions?: {
        id: string;
        label: string;
        type: 'text' | 'paragraph' | 'choice';
        options?: string[];
        required: boolean;
        logic?: { parentId: string; parentValue: string; };
        hasComplementary?: boolean;
        complementaryTrigger?: string;
        complementaryLabel?: string;
    }[];
    vaga_primary_color?: string | null;
    vaga_gradient_end?: string | null;
    vaga_bg_color?: string | null;
    vaga_bg_image?: string | null;
    organization_id?: string | null;
}

const CSS = `
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeSlideDown {
    from { opacity: 0; transform: translateY(-16px); }
    to   { opacity: 1; transform: translateY(0); }
}
@keyframes messagePop {
    0%   { opacity: 0; transform: translateY(12px) scale(0.97); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
}
@keyframes successBounce {
    0%   { transform: scale(0.5); opacity: 0; }
    70%  { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
}
@keyframes dots {
    0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
    40%            { transform: scale(1); opacity: 1; }
}
.typing-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; animation: dots 1.2s infinite ease-in-out; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

.chat-bubble-new {
    position: relative;
    background: rgba(255,255,255,0.07);
    backdrop-filter: blur(12px);
    /* O segredo: Clip path desenha o balão e a cauda como uma peça única */
    clip-path: polygon(
        0% 0%, 
        0% 0%, 
        100% 0%, 
        100% 100%, 
        0% 100%, 
        0% 12px, 
        -12px 0%
    );
    /* Compensação para a cauda não ser cortada */
    margin-left: 12px;
    padding: 16px 20px;
    border-radius: 0 20px 20px 20px;
    color: #e2e8f0;
    font-size: 15px;
    line-height: 1.65;
    /* Sombras e borda simulada para evitar o "risco" */
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.25));
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1);
}

.wizard-input {
    width: 100%;
    padding: 14px 18px;
    background: rgba(255,255,255,0.04);
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    color: #f1f5f9;
    font-size: 15px;
    outline: none;
    transition: all 0.25s;
    font-family: inherit;
    box-sizing: border-box;
}
.wizard-input:focus {
    border-color: var(--primary-hex, #6366f1);
    background: rgba(99,102,241,0.06);
    box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
}
.wizard-input::placeholder { color: #475569; }

.wizard-btn-primary {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 14px 28px;
    background: linear-gradient(135deg, #6366f1, #7c3aed);
    border: none; border-radius: 12px;
    color: #fff; font-size: 15px; font-weight: 700;
    cursor: pointer; transition: all 0.25s;
    box-shadow: 0 6px 24px rgba(99,102,241,0.35);
}
.wizard-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(99,102,241,0.5);
}
.wizard-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.wizard-btn-ghost {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 11px 20px;
    background: transparent;
    border: 1.5px solid rgba(255,255,255,0.12); border-radius: 10px;
    color: #94a3b8; font-size: 14px; font-weight: 500;
    cursor: pointer; transition: all 0.2s;
}
.wizard-btn-ghost:hover { border-color: rgba(255,255,255,0.25); color: #f1f5f9; }

.radio-opt {
    display: flex; align-items: center; gap: 12px;
    padding: 13px 16px;
    background: rgba(255,255,255,0.03);
    border: 1.5px solid rgba(255,255,255,0.09);
    border-radius: 10px; cursor: pointer;
    transition: all 0.2s; font-size: 14px; color: #94a3b8;
}
.radio-opt.selected {
    border-color: #6366f1;
    background: rgba(99,102,241,0.1);
    color: #f1f5f9;
}
.radio-opt:hover:not(.selected) {
    border-color: rgba(255,255,255,0.2);
    color: #cbd5e1;
}
`;

const BotAvatar = () => (
    <div style={{
        width: 54, height: 54, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        padding: '2px', position: 'relative',
        boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.15)'
    }}>
        <img 
            src="/avatar-recrutador.png" 
            alt="Assistant"
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: '50%', background: '#10b981', border: '2.5px solid #0f172a', boxShadow: '0 0 10px #10b981' }} />
    </div>
);

const TypingIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0px' }}>
        <BotAvatar />
        <div className="chat-bubble-new" style={{ flex: 'initial' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
            </div>
        </div>
    </div>
);

const MessageBubble = ({ text }: { text: string }) => (
    <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '0px',
        animation: `messagePop 0.45s ease-out both`,
        width: '100%'
    }}>
        <BotAvatar />
        <div className="chat-bubble-new" style={{ flex: 1 }} dangerouslySetInnerHTML={{ __html: text }} />
    </div>
);

const ProgressBar = ({ step, total }: { step: number; total: number }) => (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
                height: '4px',
                borderRadius: '2px',
                flex: 1,
                background: i < step ? 'linear-gradient(90deg, #6366f1, #7c3aed)' : 'rgba(255,255,255,0.1)',
                transition: 'all 0.4s ease',
                boxShadow: i < step ? '0 0 8px rgba(99,102,241,0.5)' : 'none'
            }} />
        ))}
    </div>
);

const maskPhone = (val: string) => {
    let v = val.replace(/\D/g, '');
    if (v.length <= 10) {
        v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
        v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
        v = v.replace(/(\d{5})(\d)/, '$1-$2');
    }
    return v.substring(0, 15);
};

export const JobApplication = () => {
    const { hash } = useParams<{ hash: string }>();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [step, setStep] = useState(0);
    const [showTyping, setShowTyping] = useState(false);
    const [contentVisible, setContentVisible] = useState(false);

    const [formData, setFormData] = useState({ name: '', email: '', phone: '', linkedin: '', location: '' });
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
    
    // Lista de cidades para select
    const [brazilCities, setBrazilCities] = useState<string[]>([]);
    const [loadingCities, setLoadingCities] = useState(true);
    const [showCityDropdown, setShowCityDropdown] = useState(false);

    const primaryColor = job?.vaga_primary_color || '#6366f1';
    const gradientEnd = job?.vaga_gradient_end || '#7c3aed';

    const hasQuestions = (job?.custom_questions?.length ?? 0) > 0;
    const totalSteps = hasQuestions ? 4 : 3;
    const stepLabels = hasQuestions
        ? ['Seu nome', 'Contato', 'Perguntas', 'Currículo']
        : ['Seu nome', 'Contato', 'Currículo'];

    useEffect(() => {
        const fetchJob = async () => {
            if (!hash) return;
            try {
                const { data, error: err } = await supabase
                    .from('vagas_white_label')
                    .select('id, organization_id, title, company_name, description, responsibilities, requirements, differentials, additional_info, has_location, location, work_model, is_accepting_applications, custom_questions, vaga_primary_color, vaga_gradient_end, vaga_bg_color, vaga_bg_image')
                    .eq('public_hash', hash)
                    .eq('is_active', true)
                    .single();

                if (err) throw err;
                if (!(data as any).is_accepting_applications) {
                    setError('Esta vaga não está mais aceitando candidaturas.');
                    return;
                }
                setJob(data as Job);
            } catch {
                setError('Vaga não encontrada.');
            } finally {
                setLoading(false);
            }
        };
        fetchJob();
    }, [hash]);

    useEffect(() => {
        const CACHE_KEY = 'ibge_br_cities_v2';
        const loadCities = async () => {
            setLoadingCities(true);
            try {
                // Check cache first
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 1000) {
                        setBrazilCities(parsed);
                        setLoadingCities(false);
                        return;
                    }
                }
                // Fetch from IBGE
                const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome');
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                if (!Array.isArray(data) || data.length === 0) throw new Error('Empty data');
                const formatted = data.map((c: any) => {
                    const uf = c?.microrregiao?.mesorregiao?.UF?.sigla ?? c?.['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla ?? '';
                    return `${c.nome}${uf ? ` - ${uf}` : ''}`;
                }).sort();
                setBrazilCities(formatted);
                try { localStorage.setItem(CACHE_KEY, JSON.stringify(formatted)); } catch { /* quota exceeded */ }
            } catch (err) {
                console.error('[JobApplication] Falha ao carregar cidades do IBGE:', err);
                // Fallback com capitais + principais cidades
                setBrazilCities([
                    'São Paulo - SP','Rio de Janeiro - RJ','Brasília - DF','Salvador - BA',
                    'Fortaleza - CE','Belo Horizonte - MG','Manaus - AM','Curitiba - PR',
                    'Recife - PE','Porto Alegre - RS','Belém - PA','Goiânia - GO',
                    'Guarulhos - SP','Campinas - SP','São Luís - MA','São Gonçalo - RJ',
                    'Maceió - AL','Natal - RN','Teresina - PI','Campo Grande - MS',
                    'João Pessoa - PB','Santo André - SP','Osasco - SP','Jaboatão dos Guararapes - PE',
                    'Ribeirão Preto - SP','Uberlândia - MG','Sorocaba - SP','Contagem - MG',
                    'Aracaju - SE','Feira de Santana - BA','Cuiabá - MT','Joinville - SC',
                    'Juiz de Fora - MG','Londrina - PR','Aparecida de Goiânia - GO',
                    'Ananindeua - PA','Porto Velho - RO','Florianópolis - SC','Serra - ES',
                    'Caxias do Sul - RS','Macapá - AP','Mogi das Cruzes - SP','Diadema - SP',
                    'Santos - SP','Betim - MG','Niterói - RJ','Vila Velha - ES',
                    'Rio Branco - AC','Boa Vista - RR','Palmas - TO','Macaé - RJ',
                ].sort());
            } finally {
                setLoadingCities(false);
            }
        };
        loadCities();
    }, []);

    const removeAccents = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');


    const triggerStepReveal = useCallback((delay = 300) => {
        setContentVisible(false);
        setShowTyping(true);
        setTimeout(() => {
            setShowTyping(false);
            setContentVisible(true);
        }, delay + 900);
    }, []);

    useEffect(() => {
        if (!loading && job) {
            triggerStepReveal(200);
        }
    }, [loading, job]);

    const goToNextStep = useCallback(() => {
        setStep(s => s + 1);
        triggerStepReveal(200);
        setTimeout(() => {
            containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    }, [triggerStepReveal]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') { toast.error('Apenas PDFs são aceitos.'); return; }
        if (file.size > 10 * 1024 * 1024) { toast.error('O arquivo deve ter no máximo 10MB.'); return; }
        setResumeFile(file);
    };

    const uploadResume = async (): Promise<string | null> => {
        if (!resumeFile || !job) return null;
        
        // PROTEÇÃO [RED TEAM]: Hacker pode tentar usar Burp Suite pra enviar um .exe fraudulento.
        // Forçamos a extensão a ser .pdf para matar a execução e o contentType para application/pdf.
        const safeExtensionsOnly = 'pdf';
        const filePath = `resumes/${job.id}/${Date.now()}_secure.${safeExtensionsOnly}`;
        
        const { error: uploadError } = await supabase.storage.from('job-applications').upload(filePath, resumeFile, { 
            cacheControl: '3600', 
            upsert: false,
            contentType: 'application/pdf'
        });
        
        if (uploadError) { toast.error('Erro ao enviar currículo.'); return null; }
        const { data: { publicUrl } } = supabase.storage.from('job-applications').getPublicUrl(filePath);
        return publicUrl;
    };

    const handleSubmit = async () => {
        if (!resumeFile) { toast.error('Envie seu currículo em PDF.'); return; }
        setSubmitting(true);
        try {
            const resumeUrl = await uploadResume();
            
            // Filtro das respostas
            const filteredAnswers = Object.fromEntries(
                Object.entries(customAnswers).filter(([key, val]) => {
                    if (!val) return false;
                    const isExtra = key.endsWith('_extra');
                    const baseId = isExtra ? key.replace('_extra', '') : key;
                    const q = job!.custom_questions?.find(item => item.id === baseId);
                    if (!q) return false;
                    if (isExtra) { if (!q.hasComplementary) return false; if (q.complementaryTrigger && customAnswers[baseId] !== q.complementaryTrigger) return false; return true; }
                    if (!q.logic?.parentId) return true;
                    return customAnswers[q.logic.parentId] === q.logic.parentValue;
                })
            );

            // Análise com IA local (TypeScript no browser, igual ao AnaliseNova)
            let aiResult: JobMatchResult | null = null;
            try {
                const combinedJobDesc = `
${job!.description ? `Descrição:\n${job!.description}\n\n` : ''}
${job!.responsibilities ? `Responsabilidades:\n${job!.responsibilities}\n\n` : ''}
${job!.requirements ? `Requisitos:\n${job!.requirements}\n\n` : ''}
${job!.differentials ? `Diferenciais:\n${job!.differentials}\n\n` : ''}
${job!.additional_info ? `Informações Adicionais:\n${job!.additional_info}\n\n` : ''}
`.trim();

                aiResult = await analyzeJobApplication(
                    resumeFile,
                    job!.title,
                    combinedJobDesc,
                    filteredAnswers
                );
            } catch (aiErr) {
                console.error("Erro na análise via IA, prosseguindo com cadastro...", aiErr);
            }

            // Unir resultados da IA com as respostas do usuário caso a IA tenha funcionado
            const finalAnswers = {
                ...filteredAnswers,
                _ai_analysis: aiResult ? {
                    classification: aiResult.classification,
                    summary: aiResult.summary,
                    skills: aiResult.skills,
                    strengths: aiResult.strengths,
                    gaps: aiResult.gaps,
                } : null
            };

            const { error: err } = await supabase.from('vagas_candidaturas').insert({
                vaga_id: job!.id,
                candidate_name: formData.name,
                candidate_email: formData.email,
                candidate_phone: formData.phone || null,
                candidate_location: formData.location || null,
                candidate_linkedin: formData.linkedin || null,
                resume_url: resumeUrl,
                resume_file_name: resumeFile.name,
                status: aiResult ? 'reviewed' : 'pending',
                match_score: aiResult ? aiResult.score : 0,
                source: 'public_link',
                answers: finalAnswers
            });
            
            if (err) throw err;
            setSubmitted(true);
        } catch {
            toast.error('Erro ao enviar candidatura. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#0B1020', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <style>{CSS}</style>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, border: '4px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                    <p style={{ color: '#94a3b8', fontSize: '14px' }}>Carregando...</p>
                </div>
            </div>
        );
    }

    if (error || !job) {
        return (
            <div style={{ minHeight: '100vh', background: '#0B1020', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <style>{CSS}</style>
                <div style={{ textAlign: 'center', maxWidth: 500 }}>
                    <AlertCircle size={64} style={{ color: '#ef4444', margin: '0 auto 24px' }} />
                    <h1 style={{ color: '#f1f5f9', fontSize: 28, fontWeight: 700, marginBottom: 12 }}>{error || 'Vaga não encontrada'}</h1>
                    <button className="wizard-btn-primary" onClick={() => navigate(-1)}>Voltar</button>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div style={{ minHeight: '100vh', background: job.vaga_bg_image ? `url(${job.vaga_bg_image}) center/cover no-repeat` : (job.vaga_bg_color || '#0B1020'), display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <style>{CSS}</style>
                <div style={{ textAlign: 'center', maxWidth: 560, animation: 'fadeSlideUp 0.6s ease-out' }}>
                    <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', animation: 'successBounce 0.6s ease-out', boxShadow: '0 0 40px rgba(16,185,129,0.4)' }}>
                        <CheckCircle size={50} style={{ color: '#fff' }} />
                    </div>

                    <div style={{ fontSize: 32 }}>🎉</div>
                    <h1 style={{ color: '#f1f5f9', fontSize: 30, fontWeight: 800, margin: '12px 0 8px' }}>
                        Candidatura enviada, {formData.name.split(' ')[0]}!
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.7, marginBottom: 8 }}>
                        Muito obrigado por se candidatar à vaga de <strong style={{ color: '#f1f5f9' }}>{job.title}</strong>.
                    </p>
                    <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
                        Boa sorte! Torço muito para que essa seja a vaga certa pra você. 🍀<br />
                        {job.company_name && `Em breve a equipe da ${job.company_name} pode entrar em contato.`}
                    </p>

                    <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: '18px 24px', marginBottom: 32, textAlign: 'left' }}>
                        <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
                            📧 Confirmação enviada para <strong style={{ color: '#f1f5f9' }}>{formData.email}</strong>
                        </p>
                    </div>

                     <button 
                        className="wizard-btn-primary" 
                        onClick={() => job.organization_id ? navigate(`/carreiras/${job.organization_id}`) : navigate(`/v/${hash}`)}
                    >
                        <Heart size={16} /> Voltar para o Portal
                    </button>
                </div>
            </div>
        );
    }

    const firstName = formData.name.trim().split(' ')[0];

    const stepMessages: Record<number, { bubble: string }> = {
        0: {
            bubble: `Oi! Tudo bem? 😊<br><br>Que ótima vaga você escolheu — <strong>${job.title}</strong>${job.company_name ? ` na <strong>${job.company_name}</strong>` : ''}!<br><br>Para começarmos, preciso que você me diga seu <strong>nome completo</strong>.`
        },
        1: {
            bubble: `Prazer em te conhecer, <strong>${firstName}</strong>! 🙌<br><br>Agora preciso de mais alguns dados de contato. Estas informações ajudarão o recrutador a entrar em contato com você.`
        },
        2: {
            bubble: `Perfeito! Estamos quase lá, ${firstName}. 💪<br><br>O recrutador preparou algumas perguntas adicionais para te conhecer melhor. Responda com calma, sem pressa!`
        },
        3: {
            bubble: `Uau, ${firstName}! Você está indo super bem! 🌟<br><br>Só falta uma etapa: envie o seu <strong>currículo em PDF</strong>. Após isso, sua candidatura estará completa!`
        },
    };

    const msg = stepMessages[step];

    const canAdvanceStep0 = formData.name.trim().length >= 3;
    const canAdvanceStep1 = formData.email.trim() && formData.phone.trim().length >= 14;
    const canAdvanceStep2 = (() => {
        if (!job.custom_questions) return true;
        for (const q of job.custom_questions) {
            if (q.logic?.parentId && customAnswers[q.logic.parentId] !== q.logic.parentValue) continue;
            if (q.required && !customAnswers[q.id]?.trim()) return false;
        }
        return true;
    })();

    return (
        <div
            ref={containerRef}
            style={{
                minHeight: '100vh',
                background: job.vaga_bg_image ? `url(${job.vaga_bg_image}) center/cover no-repeat fixed` : (job.vaga_bg_color || '#0B1020'),
                fontFamily: "'Inter', system-ui, sans-serif",
                overflowX: 'hidden',
                paddingBottom: 40
            }}
        >
            <style>{CSS}</style>
            <style>{`:root { --primary-hex: ${primaryColor}; }`}</style>

            {/* Header */}
            <div style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${gradientEnd} 100%)`,
                padding: '24px 32px 32px',
                position: 'relative', overflow: 'hidden'
            }}>
                <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
                <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
                    <button
                        className="wizard-btn-ghost"
                        onClick={() => navigate(-1)}
                        style={{ marginBottom: 16, borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)' }}
                    >
                        <ArrowLeft size={15} /> Voltar para a vaga
                    </button>
                    <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>
                        Candidate-se à Vaga
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>
                        {job.title}{job.company_name && ` • ${job.company_name}`}
                    </p>

                    {/* Progress */}
                    <div style={{ marginTop: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            {stepLabels.map((label, i) => (
                                <span key={i} style={{
                                    fontSize: 11, fontWeight: 600,
                                    color: i <= step ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                                    transition: 'color 0.3s'
                                }}>
                                    {label}
                                </span>
                            ))}
                        </div>
                        <ProgressBar step={step + 1} total={totalSteps} />
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px 80px' }}>

                {showTyping && (
                    <div style={{ marginTop: 24, animation: 'fadeSlideDown 0.3s ease-out' }}>
                        <TypingIndicator />
                    </div>
                )}

                {contentVisible && (
                    <div style={{ marginTop: 24, animation: 'fadeSlideUp 0.5s ease-out' }}>

                        {/* Bot Message */}
                        {msg && (
                            <div style={{ marginBottom: 32 }}>
                                <MessageBubble text={msg.bubble} />
                            </div>
                        )}

                        {/* STEP 0: Name */}
                        {step === 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ position: 'relative' }}>
                                    <User size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                                    <input
                                        autoFocus
                                        className="wizard-input"
                                        style={{ paddingLeft: 46 }}
                                        type="text"
                                        placeholder="Seu nome completo"
                                        value={formData.name}
                                        onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && canAdvanceStep0 && goToNextStep()}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                                    <button
                                        className="wizard-btn-primary"
                                        disabled={!canAdvanceStep0}
                                        onClick={goToNextStep}
                                    >
                                        Continuar <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 1: Contact */}
                        {step === 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                                    <input autoFocus className="wizard-input" style={{ paddingLeft: 46 }} type="email" placeholder="seu@email.com *" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Phone size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                                    <input 
                                        className="wizard-input" 
                                        style={{ paddingLeft: 46 }} 
                                        type="tel" 
                                        placeholder="(11) 99999-9999 *" 
                                        value={formData.phone} 
                                        onChange={e => setFormData(p => ({ ...p, phone: maskPhone(e.target.value) }))} 
                                    />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <MapPin size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none', zIndex: 2 }} />
                                    <input 
                                        className="wizard-input" 
                                        style={{ paddingLeft: 46, paddingRight: 40 }} 
                                        type="text" 
                                        placeholder="Cidade / Estado  (ex: São Paulo - SP) *" 
                                        value={formData.location} 
                                        onChange={e => {
                                            setFormData(p => ({ ...p, location: e.target.value }));
                                            setShowCityDropdown(true);
                                        }}
                                        onFocus={() => setShowCityDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                                    />
                                    <ChevronDown size={18} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none', zIndex: 2 }} />
                                    
                                    {showCityDropdown && (
                                        <div style={{ 
                                            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, 
                                            background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', 
                                            borderRadius: 12, maxHeight: 200, overflowY: 'auto', zIndex: 50,
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                                        }}>
                                            {loadingCities ? (
                                                <div style={{ padding: '10px 16px', color: '#64748b', fontSize: 14 }}>
                                                    <div style={{ width: 14, height: 14, border: '2px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
                                                    Carregando cidades do Brasil...
                                                </div>
                                            ) : (
                                                <>
                                                    {(() => {
                                                        const safeInput = removeAccents(formData.location.toLowerCase());
                                                        const filtered = brazilCities.filter(c => removeAccents(c.toLowerCase()).includes(safeInput)).slice(0, 50);
                                                        if (filtered.length === 0) {
                                                            return <div style={{ padding: '10px 16px', color: '#64748b', fontSize: 14 }}>Nenhuma cidade encontrada</div>;
                                                        }
                                                        return filtered.map(city => (
                                                            <div 
                                                                key={city}
                                                                style={{ padding: '10px 16px', color: '#cbd5e1', fontSize: 14, cursor: 'pointer', transition: 'background 0.2s' }}
                                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                                onMouseDown={(e) => { e.preventDefault(); setFormData(p => ({ ...p, location: city })); setShowCityDropdown(false); }}
                                                            >
                                                                {city}
                                                            </div>
                                                        ));
                                                    })()}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Linkedin size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                                    <input className="wizard-input" style={{ paddingLeft: 46 }} type="url" placeholder="https://linkedin.com/in/seu-perfil (opcional)" value={formData.linkedin} onChange={e => setFormData(p => ({ ...p, linkedin: e.target.value }))} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                                    <button className="wizard-btn-ghost" onClick={() => { setStep(0); triggerStepReveal(); }}>
                                        <ArrowLeft size={14} /> Voltar
                                    </button>
                                    <button className="wizard-btn-primary" disabled={!canAdvanceStep1 || !formData.location.trim()} onClick={goToNextStep}>
                                        Continuar <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: Custom Questions */}
                        {step === 2 && hasQuestions && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                {job.custom_questions!.map(q => {
                                    if (q.logic?.parentId && customAnswers[q.logic.parentId] !== q.logic.parentValue) return null;
                                    return (
                                        <div key={q.id} style={{ animation: 'fadeSlideUp 0.4s ease-out' }}>
                                            <label style={{ display: 'block', color: '#cbd5e1', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                                                {q.label} {q.required && <span style={{ color: '#ef4444' }}>*</span>}
                                            </label>

                                            {q.type === 'text' && (
                                                <input className="wizard-input" type="text" placeholder="Sua resposta" value={customAnswers[q.id] || ''} onChange={e => setCustomAnswers(p => ({ ...p, [q.id]: e.target.value }))} />
                                            )}

                                            {q.type === 'paragraph' && (
                                                <textarea className="wizard-input" placeholder="Sua resposta detalhada..." rows={4} value={customAnswers[q.id] || ''} onChange={e => setCustomAnswers(p => ({ ...p, [q.id]: e.target.value }))} style={{ resize: 'vertical', lineHeight: '1.6', paddingTop: 12, paddingBottom: 12 }} />
                                            )}

                                            {q.type === 'choice' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    {q.options?.map(opt => (
                                                        <div
                                                            key={opt}
                                                            className={`radio-opt ${customAnswers[q.id] === opt ? 'selected' : ''}`}
                                                            onClick={() => setCustomAnswers(p => ({ ...p, [q.id]: opt }))}
                                                        >
                                                            <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${customAnswers[q.id] === opt ? '#6366f1' : '#334155'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                {customAnswers[q.id] === opt && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} />}
                                                            </div>
                                                            {opt}
                                                        </div>
                                                    ))}
                                                    {q.hasComplementary && (!q.complementaryTrigger || customAnswers[q.id] === q.complementaryTrigger) && (
                                                        <div style={{ marginTop: 8, animation: 'fadeSlideUp 0.3s ease-out' }}>
                                                            <label style={{ display: 'block', color: '#6366f1', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{q.complementaryLabel || 'Pode detalhar?'}</label>
                                                            <textarea className="wizard-input" rows={2} placeholder="Digite aqui..." value={customAnswers[`${q.id}_extra`] || ''} onChange={e => setCustomAnswers(p => ({ ...p, [`${q.id}_extra`]: e.target.value }))} style={{ resize: 'vertical', lineHeight: '1.6', paddingTop: 10, paddingBottom: 10 }} />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                                    <button className="wizard-btn-ghost" onClick={() => { setStep(1); triggerStepReveal(); }}>
                                        <ArrowLeft size={14} /> Voltar
                                    </button>
                                    <button className="wizard-btn-primary" disabled={!canAdvanceStep2} onClick={goToNextStep}>
                                        Continuar <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3 (or 2): Resume */}
                        {((step === 3 && hasQuestions) || (step === 2 && !hasQuestions)) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} style={{ display: 'none' }} />

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        width: '100%', padding: '32px 24px',
                                        background: resumeFile ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
                                        border: `2px dashed ${resumeFile ? '#6366f1' : 'rgba(255,255,255,0.12)'}`,
                                        borderRadius: 16, cursor: 'pointer', transition: 'all 0.25s',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                                        boxSizing: 'border-box'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = 'rgba(99,102,241,0.07)'; }}
                                    onMouseLeave={e => { if (!resumeFile) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; } }}
                                >
                                    {resumeFile ? (
                                        <>
                                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FileText size={28} style={{ color: '#6366f1' }} />
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 700, margin: '0 0 4px' }}>{resumeFile.name}</p>
                                                <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{(resumeFile.size / 1024 / 1024).toFixed(2)} MB • Clique para trocar</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Upload size={26} style={{ color: '#64748b' }} />
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ color: '#cbd5e1', fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>Clique para enviar seu currículo</p>
                                                <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>Apenas PDF • Máximo 10MB</p>
                                            </div>
                                        </>
                                    )}
                                </button>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                                    <button className="wizard-btn-ghost" onClick={() => { setStep(hasQuestions ? 2 : 1); triggerStepReveal(); }}>
                                        <ArrowLeft size={14} /> Voltar
                                    </button>
                                    <button
                                        className="wizard-btn-primary"
                                        disabled={!resumeFile || submitting}
                                        onClick={handleSubmit}
                                        style={{ background: submitting ? '#64748b' : `linear-gradient(135deg, ${primaryColor}, ${gradientEnd})` }}
                                    >
                                        {submitting ? (
                                            <>
                                                <div style={{ width: 18, height: 18, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                                Enviando...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={16} /> Enviar candidatura!
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <p style={{ textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 40 }}>
                    Etapa {step + 1} de {totalSteps}
                </p>
            </div>
        </div>
    );
};
