import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import toast from 'react-hot-toast';
import {
    ArrowLeft, User, Mail, Phone, Linkedin, MapPin, Upload, FileText,
    AlertCircle, ArrowRight, Link,
    UserRound, Calendar, ChevronDown, Check
} from 'lucide-react';
import { analyzeResume } from '../../core/services/analyzers/resumeAnalyzer';
import { sanitizeHtml } from '../../core/utils/security';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

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
@keyframes successBounce {
    0%   { transform: scale(0.5); opacity: 0; }
    70%  { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
}
@keyframes dots {
    0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
    40%            { transform: scale(1); opacity: 1; }
}
.typing-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #2C58FD; animation: dots 1.2s infinite ease-in-out; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

body { font-family: 'Space Grotesk', sans-serif; }
h1, h2, h3, h4 { font-family: 'Space Grotesk', sans-serif !important; }

.chat-bubble-new {
    position: relative;
    background: rgba(255,255,255,0.07);
    backdrop-filter: blur(12px);
    clip-path: polygon(
        0% 0%,
        0% 0%,
        100% 0%,
        100% 100%,
        0% 100%,
        0% 12px,
        -12px 0%
    );
    margin-left: 12px;
    padding: 16px 20px;
    border-radius: 0 20px 20px 20px;
    color: #e2e8f0;
    font-size: 15px;
    line-height: 1.65;
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.25));
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1);
}

.chat-bubble-typing {
    background: rgba(255,255,255,0.07);
    backdrop-filter: blur(12px);
    margin-left: 12px;
    padding: 16px 20px;
    border-radius: 24px;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1);
}

.wizard-input {
    width: 100%;
    padding: 14px 18px;
    background: rgba(255,255,255,0.04);
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    color: #f1f5f9;
    font-size: 16px;
    outline: none;
    transition: all 0.25s;
    font-family: 'Space Grotesk', sans-serif !important;
    line-height: 24px;
    letter-spacing: 0.16px;
    box-sizing: border-box;
}
.wizard-input:focus {
    border-color: var(--primary-hex, #6366f1);
    background: rgba(99,102,241,0.06);
    box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
}
.wizard-input::placeholder { color: #475569; }
.wizard-input.error { border-color: #ef4444; background: rgba(239,68,68,0.06); }
.wizard-input.error:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.12); }

.wizard-btn-primary {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 13px 28px;
    background: #2C58FD;
    border: none; border-radius: 12px;
    color: #fff; font-size: 15px; font-weight: 700;
    font-family: 'Space Grotesk', sans-serif;
    letter-spacing: 0.3px;
    cursor: pointer; transition: all 0.25s;
    box-shadow: 0 10px 30px rgba(44, 88, 253, 0.3);
}
.wizard-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 15px 40px rgba(44, 88, 253, 0.4);
}
.wizard-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

.wizard-btn-ghost {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 13px 28px;
    background: transparent;
    border: 1.5px solid rgba(255,255,255,0.12); border-radius: 12px;
    color: #94a3b8; font-size: 15px; font-weight: 700;
    font-family: 'Space Grotesk', sans-serif;
    letter-spacing: 0.3px;
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

.cs-trigger-wizard {
    display: flex; align-items: center; justify-content: space-between;
    width: 100%; padding: 14px 18px;
    background: rgba(255,255,255,0.04);
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 12px; color: #f1f5f9;
    font-size: 15px; cursor: pointer; transition: all 0.25s;
    box-sizing: border-box;
}
.cs-trigger-wizard:hover { border-color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.08); }
.cs-trigger-wizard.open { border-color: var(--primary-hex, #6366f1); background: rgba(99,102,241,0.06); }

.cs-dropdown-wizard {
    position: absolute; top: calc(100% + 8px); left: 0; width: 300px;
    background: #111827; border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 14px; padding: 6px; z-index: 1000;
    box-shadow: 0 10px 40px rgba(0,0,0,0.6);
    backdrop-filter: blur(20px); animation: csSlideUp 0.2s ease-out;
    display: flex; flex-direction: column;
}
.cs-dropdown-items-wrapper {
    max-height: 250px; overflow-y: auto; overflow-x: hidden;
    padding-right: 4px; margin-top: 4px;
}
.cs-dropdown-items-wrapper::-webkit-scrollbar { width: 4px; }
.cs-dropdown-items-wrapper::-webkit-scrollbar-track { background: transparent; }
.cs-dropdown-items-wrapper::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
.cs-dropdown-items-wrapper::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

.cs-search-wrapper {
    position: sticky; top: 0; z-index: 10;
    padding: 6px 8px; background: #111827;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    margin-bottom: 4px;
}
.cs-search-input {
    width: 100%; background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px; padding: 8px 12px;
    color: #f1f5f9; font-size: 13px; outline: none;
    transition: all 0.2s;
}
.cs-search-input:focus {
    border-color: rgba(99, 102, 241, 0.5);
    background: rgba(99, 102, 241, 0.05);
}
.cs-item-wizard {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 12px; border-radius: 8px; color: #94a3b8;
    font-size: 14px; cursor: pointer; transition: all 0.15s;
}
.cs-item-wizard:hover { background: rgba(255, 255, 255, 0.05); color: #f1f5f9; }
.cs-item-wizard.active { background: rgba(99, 102, 241, 0.15); color: #818cf8; font-weight: 600; }
.cs-dot-wizard { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
@keyframes csSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
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
            src={`${import.meta.env.BASE_URL}illustrations/avatar-recrutador.png`}
            alt="Assistant"
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', objectPosition: 'center 15%', transform: 'scale(1.2)' }}
        />
        <div style={{ position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: '50%', background: '#10b981', border: '2.5px solid #0f172a', boxShadow: '0 0 10px #10b981' }} />
    </div>
);

const TypingIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0px' }}>
        <BotAvatar />
        <div className="chat-bubble-typing" style={{ flex: 'initial' }}>
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
        width: '100%',
        fontFamily: "'Space Grotesk', sans-serif"
    }}>
        <BotAvatar />
        <div className="chat-bubble-new" style={{ flex: 1, fontFamily: "'Space Grotesk', sans-serif" }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />
    </div>
);

const ProgressBar = ({ step, total, labels }: { step: number; total: number; labels: string[] }) => (
    <div style={{ 
        position: 'relative', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        width: '100%',
        maxWidth: '600px',
        margin: '0 auto 24px',
        padding: '0 20px'
    }}>
        <style>{`
            @keyframes pulse-blue {
                0% { box-shadow: 0 0 0 0 rgba(44, 88, 253, 0.4); transform: scale(1); }
                70% { box-shadow: 0 0 0 10px rgba(44, 88, 253, 0); transform: scale(1.05); }
                100% { box-shadow: 0 0 0 0 rgba(44, 88, 253, 0); transform: scale(1); }
            }
            .active-step { animation: pulse-blue 2s infinite; }
        `}</style>
        <div style={{ 
            position: 'absolute', top: '20px', left: '40px', right: '40px', height: '2px',
            background: 'rgba(255, 255, 255, 0.1)', zIndex: 0
        }} />
        <div style={{ 
            position: 'absolute', top: '20px', left: '40px',
            width: `calc(${(step - 1) / (total - 1)} * (100% - 80px))`,
            maxWidth: 'calc(100% - 80px)',
            height: '2px', background: '#2C58FD',
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 1
        }} />
        {Array.from({ length: total }).map((_, i) => {
            const isCompleted = i + 1 < step;
            const isActive = i + 1 === step;
            return (
                <div key={i} style={{ 
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    width: '80px', position: 'relative', zIndex: 2
                }}>
                    <div 
                        className={isActive ? 'active-step' : ''}
                        style={{ 
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: isCompleted ? '#2C58FD' : '#04070c',
                            border: `2px solid ${isActive || isCompleted ? '#2C58FD' : 'rgba(255, 255, 255, 0.1)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: isCompleted ? '#fff' : (isActive ? '#2C58FD' : 'rgba(255, 255, 255, 0.3)'),
                            fontSize: '14px', fontWeight: 700,
                            fontFamily: "'Space Grotesk', sans-serif",
                            transition: 'all 0.4s ease', marginBottom: '16px'
                        }}
                    >
                        {isCompleted ? <Check size={20} strokeWidth={3} /> : i + 1}
                    </div>
                    <span style={{ 
                        fontSize: '12px', color: isActive ? '#fff' : isCompleted ? '#fff' : '#C3C7CD',
                        fontWeight: isActive || isCompleted ? 700 : 500,
                        fontFamily: "'Inter', sans-serif", textAlign: 'center',
                        whiteSpace: 'nowrap', transition: 'all 0.3s'
                    }}>
                        {labels[i]}
                    </span>
                </div>
            );
        })}
    </div>
);

const maskPhone = (val: string, country: { code: string; iso: string }) => {
    const clean = val.startsWith('+') ? '+' + val.replace(/\D/g, '') : '+' + val.replace(/\D/g, '');
    const digits = clean.replace(/\D/g, '');
    const codeDigits = country.code.replace(/\D/g, '');
    let localDigits = digits.startsWith(codeDigits) ? digits.substring(codeDigits.length) : digits;
    localDigits = localDigits.substring(0, 12);
    if (country.code === '+55') {
        let res = '+55 ';
        if (localDigits.length > 0) {
            res += '(' + localDigits.substring(0, 2);
            if (localDigits.length > 2) {
                res += ') ' + localDigits.substring(2, 7);
                if (localDigits.length > 7) res += '-' + localDigits.substring(7, 11);
            }
        }
        return res.trim();
    }
    if (country.code === '+1') {
        let res = '+1 ';
        if (localDigits.length > 0) {
            res += '(' + localDigits.substring(0, 3);
            if (localDigits.length > 3) {
                res += ') ' + localDigits.substring(3, 6);
                if (localDigits.length > 6) res += '-' + localDigits.substring(6, 10);
            }
        }
        return res.trim();
    }
    let res = country.code + ' ';
    for (let i = 0; i < localDigits.length; i++) {
        if (i > 0 && i % 3 === 0 && i < 9) res += ' ';
        res += localDigits[i];
    }
    return res.trim();
};

const maskCep = (val: string) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 5) v = v.replace(/^(\d{5})(\d)/, '$1-$2');
    return v.substring(0, 9);
};

export const SpontaneousApplication = () => {
    const isMobile = window.innerWidth < 768;
    const { orgId } = useParams<{ orgId: string }>();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(true);
    const [orgName, setOrgName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [step, setStep] = useState(0);
    const [showTyping, setShowTyping] = useState(false);
    const [contentVisible, setContentVisible] = useState(false);

    const [formData, setFormData] = useState({ 
        name: '', email: '', phone: '', linkedin: '', location: '', portfolio: '',
        cep: '', address: '', addressNumber: '', complement: '',
        gender: '', age: ''
    });
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showLGPD, setShowLGPD] = useState(false);
    const [honeypot, setHoneypot] = useState('');

    const [genderOpen, setGenderOpen] = useState(false);
    const genderRef = useRef<HTMLDivElement>(null);
    const [countryOpen, setCountryOpen] = useState(false);
    const countryRef = useRef<HTMLDivElement>(null);

    const totalSteps = 3;
    const stepLabels = ['Seu nome', 'Seus dados', 'Currículo'];

    const countries = [
        { code: '+55', iso: 'br', name: 'Brasil' },
        { code: '+54', iso: 'ar', name: 'Argentina' },
        { code: '+56', iso: 'cl', name: 'Chile' },
        { code: '+57', iso: 'co', name: 'Colômbia' },
        { code: '+1', iso: 'us', name: 'Estados Unidos' },
        { code: '+1', iso: 'ca', name: 'Canadá' },
        { code: '+351', iso: 'pt', name: 'Portugal' },
        { code: '+34', iso: 'es', name: 'Espanha' },
        { code: '+33', iso: 'fr', name: 'França' },
        { code: '+44', iso: 'gb', name: 'Reino Unido' },
        { code: '+49', iso: 'de', name: 'Alemanha' },
        { code: '+81', iso: 'jp', name: 'Japão' },
        { code: '+86', iso: 'cn', name: 'China' },
        { code: '+61', iso: 'au', name: 'Austrália' },
        { code: '+971', iso: 'ae', name: 'Emirados Árabes' },
    ];

    const [selectedCountry, setSelectedCountry] = useState(countries[0]);
    const [countrySearch, setCountrySearch] = useState('');

    const normalizeText = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const filteredCountries = countries.filter(c => {
        const search = normalizeText(countrySearch);
        return normalizeText(c.name).includes(search) || c.code.includes(search);
    });

    const handlePhoneChange = (val: string) => {
        const digits = val.replace(/\D/g, '');
        let currentCountry: typeof selectedCountry = selectedCountry;
        if (val.startsWith('+') || digits.length > 0) {
            const searchVal = val.startsWith('+') ? val : '+' + digits;
            const cleanDigits = searchVal.replace(/\D/g, '');
            let found = null;
            for (let len = 4; len >= 1; len--) {
                const prefix = '+' + cleanDigits.substring(0, len);
                found = countries.find(c => c.code === prefix);
                if (found) break;
            }
            if (found) {
                const isDifferentCode = found.code !== selectedCountry.code;
                const isMoreSpecific = found.code.startsWith(selectedCountry.code) && found.code.length > selectedCountry.code.length;
                if (isDifferentCode || isMoreSpecific) {
                    currentCountry = found;
                    setSelectedCountry(found);
                }
            }
        }
        const masked = maskPhone(val, currentCountry);
        setFormData(p => ({ ...p, phone: masked }));
    };

    useEffect(() => {
        if (!formData.phone && selectedCountry.code) {
            setFormData(p => ({ ...p, phone: selectedCountry.code + ' ' }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCountry]);

    const genderOptions = [
        { value: 'Masculino', label: 'Masculino', color: '#3b82f6' },
        { value: 'Feminino', label: 'Feminino', color: '#ec4899' },
        { value: 'Não-binário', label: 'Não-binário', color: '#8b5cf6' },
        { value: 'Outro', label: 'Outro', color: '#14b8a6' },
        { value: 'Prefiro não informar', label: 'Prefiro não informar', color: '#64748b' }
    ];

    const fetchAddress = async (cep: string) => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        address: data.logradouro || '',
                        location: `${data.localidade} - ${data.uf}`
                    }));
                    toast.success('Endereço encontrado!');
                }
            } catch { /* silent */ }
        }
    };

    useEffect(() => {
        const fetchOrgData = async () => {
            if (!orgId) return;
            try {
                const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-jobs?orgId=${orgId}`, {
                    headers: {
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                    }
                });
                if (!response.ok) throw new Error('Organização não encontrada');
                const { orgInfo } = await response.json();
                setOrgName(orgInfo?.name || '');
            } catch {
                setError('Organização não encontrada.');
            } finally {
                setLoading(false);
            }
        };
        fetchOrgData();
    }, [orgId]);

    const triggerStepReveal = useCallback((delay = 300) => {
        setContentVisible(false);
        setShowTyping(true);
        setTimeout(() => {
            setShowTyping(false);
            setContentVisible(true);
        }, delay + 900);
    }, []);

    useEffect(() => {
        if (!loading) {
            triggerStepReveal(200);
        }
    }, [loading, triggerStepReveal]);

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
        if (!resumeFile || !orgId) return null;
        const safeExtensionsOnly = 'pdf';
        const filePath = `resumes/spontaneous/${orgId}/${Date.now()}_secure.${safeExtensionsOnly}`;
        const { error: uploadError } = await supabase.storage.from('job-applications').upload(filePath, resumeFile, {
            cacheControl: '3600', upsert: false, contentType: 'application/pdf'
        });
        if (uploadError) { toast.error('Erro ao enviar currículo.'); return null; }
        const { data: { publicUrl } } = supabase.storage.from('job-applications').getPublicUrl(filePath);
        return publicUrl;
    };

    const handleSubmit = async () => {
        if (!resumeFile) { toast.error('Envie seu currículo em PDF.'); return; }
        if (honeypot) { toast.error('Erro de validação. Recarregue a página.'); return; }
        setSubmitting(true);
        try {
            const resumeUrl = await uploadResume();

            const candidatePayload = {
                email: formData.email,
                organization_id: orgId,
                name: formData.name,
                phone: formData.phone || null,
                location: formData.location || null,
                linkedin: formData.linkedin || null,
                resume_url: resumeUrl,
                resume_file_name: resumeFile.name,
                gender: formData.gender || null,
                age: formData.age || null,
                address: formData.address || null,
                portfolio: formData.portfolio || null,
                cep: formData.cep || null,
                address_number: formData.addressNumber || null,
                complement: formData.complement || null,
                vaga_id: null,
                status: 'pending',
                source: 'spontaneous',
                skills: null,
                experience: null,
                analysis: null,
            };

            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-candidate`, {
                method: 'POST',
                headers: {
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(candidatePayload)
            });

            if (!res.ok) {
                const errBody = await res.text();
                console.error('submit-candidate error:', res.status, errBody);
                throw new Error('Erro ao salvar candidato');
            }
            const submitData = await res.json();
            const candidateId = submitData.id;
            setSubmitted(true);

            try {
                await supabase.functions.invoke('send-spontaneous-email', {
                    body: { candidateId }
                });
            } catch (emailErr) {
                console.error('Erro ao enviar email:', emailErr);
            }

            analyzeResume(resumeFile).then(result => {
                const aiAnalysis = {
                    source: 'spontaneous',
                    score: result.score,
                    skills: result.skills.join(', '),
                    experience: result.experience,
                    education: result.education,
                    summary: result.summary,
                    strengths: result.strengths.join(', '),
                    gaps: result.gaps.join(', ')
                };
                supabase.from('candidates').update({
                    score: result.score,
                    skills: String(result.skills),
                    experience: result.experience,
                    analysis: {
                        ...aiAnalysis,
                        history: [{
                            type: 'spontaneous',
                            date: new Date().toISOString(),
                            summary: result.summary,
                            skills: result.skills,
                            experience: result.experience,
                            education: result.education,
                            strengths: result.strengths,
                            gaps: result.gaps
                        }]
                    }
                }).eq('email', formData.email).eq('organization_id', orgId).then(({ error }) => {
                    if (error) console.error('Erro ao atualizar análise:', error);
                });
            }).catch(err => {
                console.error('Análise IA falhou silenciosamente:', err);
            });
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

    if (error || !orgId) {
        return (
            <div style={{ minHeight: '100vh', background: '#0B1020', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <style>{CSS}</style>
                <div style={{ textAlign: 'center', maxWidth: 500 }}>
                    <AlertCircle size={64} style={{ color: '#ef4444', margin: '0 auto 24px' }} />
                    <h1 style={{ color: '#f1f5f9', fontSize: 28, fontWeight: 700, marginBottom: 12 }}>{error || 'Página não encontrada'}</h1>
                    <button className="wizard-btn-primary" onClick={() => navigate(-1)}>Voltar</button>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div style={{
                minHeight: '100vh', background: '#04070c', display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: '24px',
                position: 'relative', overflow: 'hidden', fontFamily: "'Space Grotesk', sans-serif"
            }}>
                <style>{CSS}</style>
                <div style={{
                    position: 'absolute', top: 0, right: 0, width: '70%', height: '100%',
                    pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
                    background: 'radial-gradient(53.74% 45.93% at 100% 50%, rgba(44, 88, 253, 0.15) 0%, rgba(26, 53, 151, 0) 100%)',
                    filter: 'blur(40px)'
                }}>
                    <svg width="2122" height="1434" viewBox="-1350 0 2122 1434" fill="none" style={{ position: 'absolute', top: 0, right: '-20%', height: '120%', width: 'auto', opacity: 0.4 }}>
                        <path d="M-1304.14 405.498C-1197.64 48.9343 -644.279 -100.653 -68.1689 71.3844C507.941 243.422 888.637 671.939 782.139 1028.5C675.642 1385.07 122.279 1534.65 -453.831 1362.62C-1029.94 1190.58 -1410.64 762.061 -1304.14 405.498Z" fill="url(#paint_success)" />
                        <defs>
                            <radialGradient id="paint_success" cx="0" cy="0" r="1" gradientTransform="matrix(192.831 -645.616 1043.14 311.502 -261 717)" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#2C58FD"/><stop offset="1" stopColor="#1A3597" stopOpacity="0"/>
                            </radialGradient>
                        </defs>
                    </svg>
                </div>
                <div style={{ textAlign: 'center', maxWidth: '480px', animation: 'fadeSlideUp 0.6s ease-out', position: 'relative', zIndex: 1 }}>
                    <div style={{ margin: '0 auto 32px', display: 'flex', justifyContent: 'center' }}>
                        <svg width="64" height="80" viewBox="0 0 64 80" fill="none">
                            <path d="M40 4V20C40 21.0609 40.4214 22.0783 41.1716 22.8284C41.9217 23.5786 42.9391 24 44 24H60M40 4H12C9.87827 4 7.84344 4.84285 6.34315 6.34315C4.84285 7.84344 4 9.87827 4 12V68C4 70.1217 4.84285 72.1566 6.34315 73.6569C7.84344 75.1571 9.87827 76 12 76H52C54.1217 76 56.1566 75.1571 57.6569 73.6569C59.1571 72.1566 60 70.1217 60 68V24M40 4L60 24M20 52L28 60L44 44" stroke="#22c55e" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>
                        Currículo cadastrado!
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '1.6', marginBottom: '32px' }}>
                        Recebemos seu currículo, <strong style={{ color: '#fff' }}>{formData.name.split(' ')[0]}</strong>!<br /><br />
                        Entraremos em contato quando surgir uma oportunidade que combine com seu perfil. 🍀
                    </p>
                    <button
                        onClick={() => navigate(`/carreiras/${orgId}`)}
                        className="wizard-btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                    >
                        Voltar para o Portal
                    </button>
                </div>
            </div>
        );
    }

    const firstName = formData.name.trim().split(' ')[0];

    const stepMessages: Record<number, { bubble: string }> = {
        0: {
            bubble: `Olá! Tudo bem? 😊<br><br>Que bom que você tem interesse em fazer parte do time da <strong>${orgName}</strong>!<br><br>Para começarmos, me diga seu <strong>nome completo</strong>.`
        },
        1: {
            bubble: `Prazer em te conhecer, <strong>${firstName}</strong>! 🙌<br><br>Agora preciso de alguns dados de contato para que nosso time possa entrar em contato com você.`
        },
        2: {
            bubble: `Perfeito, ${firstName}! Última etapa: envie seu <strong>currículo em PDF</strong>. Vou fazer uma análise geral do seu perfil para identificar áreas compatíveis!`
        }
    };

    const canAdvanceStep0 = formData.name.trim().length >= 3;
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
    const isEmailInvalid = formData.email.trim().length > 0 && !isValidEmail;
    const canAdvanceStep1 =
        isValidEmail &&
        formData.phone.trim().length >= 14 &&
        formData.cep.trim().length === 9 &&
        formData.address.trim() &&
        formData.addressNumber.trim() &&
        formData.location.trim();

    return (
        <div style={{
            minHeight: '100vh', background: '#04070c', color: '#fff',
            position: 'relative', overflowX: 'hidden', fontFamily: "'Manrope', sans-serif"
        }}>
            <style>{CSS}</style>
            <div style={{
                position: 'fixed', top: 0, right: 0, width: '70%', height: '100%',
                pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
                background: 'radial-gradient(53.74% 45.93% at 100% 50%, rgba(44, 88, 253, 0.15) 0%, rgba(26, 53, 151, 0) 100%)',
                filter: 'blur(40px)'
            }}>
                <svg width="2122" height="1434" viewBox="-1350 0 2122 1434" fill="none" style={{ position: 'absolute', top: 0, right: '-20%', height: '120%', width: 'auto', opacity: 0.4 }}>
                    <path d="M-1304.14 405.498C-1197.64 48.9343 -644.279 -100.653 -68.1689 71.3844C507.941 243.422 888.637 671.939 782.139 1028.5C675.642 1385.07 122.279 1534.65 -453.831 1362.62C-1029.94 1190.58 -1410.64 762.061 -1304.14 405.498Z" fill="url(#paint0)" />
                    <defs>
                        <radialGradient id="paint0" cx="0" cy="0" r="1" gradientTransform="matrix(192.831 -645.616 1043.14 311.502 -261 717)" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#2C58FD"/><stop offset="1" stopColor="#1A3597" stopOpacity="0"/>
                        </radialGradient>
                    </defs>
                </svg>
            </div>

            <header style={{
                background: 'transparent', backdropFilter: 'blur(10px)',
                padding: isMobile ? '20px 24px 10px' : '40px 24px 20px',
                position: 'sticky', top: 0, zIndex: 10, textAlign: 'center'
            }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <h1 style={{
                        fontSize: '36px', fontWeight: 700, margin: '0 0 8px',
                        fontFamily: "'Space Grotesk', sans-serif",
                        letterSpacing: '-0.02em', color: '#ffffff'
                    }}>
                        Trabalhe Conosco
                    </h1>
                    <p style={{
                        color: '#2C58FD', fontSize: '16px', fontWeight: 600,
                        marginBottom: isMobile ? '16px' : '24px',
                        fontFamily: "'Space Grotesk', sans-serif",
                        textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>
                        {orgName}
                    </p>
                    <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                        <ProgressBar step={step + 1} total={totalSteps} labels={stepLabels} />
                    </div>
                </div>
            </header>

            <main
                ref={containerRef}
                style={{
                    maxWidth: '640px', margin: '0 auto',
                    padding: isMobile ? '0px 24px 120px' : '10px 24px 120px',
                    position: 'relative', zIndex: 1,
                    fontFamily: "'Inter', sans-serif", color: '#C3C7CD'
                }}
            >
                {showTyping && (
                    <div style={{ marginTop: 24, animation: 'fadeSlideDown 0.3s ease-out' }}>
                        <TypingIndicator />
                    </div>
                )}

                {contentVisible && (
                    <div style={{ marginTop: 24, animation: 'fadeSlideUp 0.5s ease-out' }}>
                        {stepMessages[step] && (
                            <div style={{ marginBottom: 16 }}>
                                <MessageBubble text={stepMessages[step].bubble} />
                            </div>
                        )}

                        {step === 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ position: 'relative' }}>
                                    <User size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                                    <input
                                        autoFocus className="wizard-input" style={{ paddingLeft: 46 }}
                                        type="text" placeholder="Seu nome completo"
                                        value={formData.name}
                                        onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && canAdvanceStep0 && goToNextStep()}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                    <button
                                        className="wizard-btn-ghost"
                                        onClick={() => navigate(`/carreiras/${orgId}`)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                    >
                                        <ArrowLeft size={14} /> Voltar
                                    </button>
                                    <button className="wizard-btn-primary" disabled={!canAdvanceStep0} onClick={goToNextStep}>
                                        Continuar <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                                    <input autoFocus className={`wizard-input${isEmailInvalid ? ' error' : ''}`} style={{ paddingLeft: 46 }} type="email" placeholder="seu@email.com *" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ position: 'relative' }} ref={countryRef}>
                                        <div
                                            className={`cs-trigger-wizard ${countryOpen ? 'open' : ''}`}
                                            style={{ width: '85px', height: '51px', padding: '0 12px' }}
                                            onClick={() => setCountryOpen(!countryOpen)}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: '100%' }}>
                                                <img src={`https://flagcdn.com/w40/${selectedCountry.iso}.png`} width="24" alt={selectedCountry.name} style={{ borderRadius: '3px', flexShrink: 0 }} />
                                                <ChevronDown size={14} style={{ color: '#64748b', opacity: 0.8 }} />
                                            </div>
                                        </div>
                                        {countryOpen && (
                                            <div className="cs-dropdown-wizard">
                                                <div className="cs-search-wrapper">
                                                    <input autoFocus className="cs-search-input" placeholder="Procurar país..." value={countrySearch} onChange={e => setCountrySearch(e.target.value)} onClick={e => e.stopPropagation()} />
                                                </div>
                                                <div className="cs-dropdown-items-wrapper">
                                                    {filteredCountries.map(c => (
                                                        <div key={c.iso + c.code} className={`cs-item-wizard ${selectedCountry.iso === c.iso && selectedCountry.code === c.code ? 'active' : ''}`}
                                                            onClick={() => { setSelectedCountry(c); setCountryOpen(false); setCountrySearch(''); setFormData(p => ({ ...p, phone: c.code + ' ' })); }}>
                                                            <img src={`https://flagcdn.com/w40/${c.iso}.png`} width="22" alt={c.name} style={{ borderRadius: '2px', flexShrink: 0 }} />
                                                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                                                                <span style={{ fontSize: '14px', color: '#f1f5f9' }}>{c.name}</span>
                                                                <span style={{ fontSize: '11px', color: '#64748b' }}>{c.code}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <Phone size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                                        <input className="wizard-input" style={{ paddingLeft: 46 }} type="tel" placeholder={selectedCountry.code + ' (00) 00000-0000'} value={formData.phone} onChange={e => handlePhoneChange(e.target.value)} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
                                    <div style={{ position: 'relative' }}>
                                        <Calendar size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                                        <input className="wizard-input" style={{ paddingLeft: 46 }} type="text" placeholder="Idade" value={formData.age} onChange={e => { let val = e.target.value.replace(/\D/g, ''); if (val.length > 2) val = val.slice(0, 2); setFormData(p => ({ ...p, age: val })); }} />
                                    </div>
                                    <div style={{ position: 'relative' }} ref={genderRef}>
                                        <div className={`cs-trigger-wizard ${genderOpen ? 'open' : ''}`} onClick={() => setGenderOpen(!genderOpen)}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <UserRound size={17} style={{ color: '#64748b', flexShrink: 0 }} />
                                                <span style={{ color: formData.gender ? '#f1f5f9' : '#475569' }}>{formData.gender || 'Selecione o Gênero'}</span>
                                            </div>
                                            <ChevronDown size={16} style={{ color: '#64748b', transform: genderOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                        </div>
                                        {genderOpen && (
                                            <div className="cs-dropdown-wizard">
                                                {genderOptions.map(opt => (
                                                    <div key={opt.value} className={`cs-item-wizard ${formData.gender === opt.value ? 'active' : ''}`}
                                                        onClick={() => { setFormData(p => ({ ...p, gender: opt.value })); setGenderOpen(false); }}>
                                                        <div className="cs-dot-wizard" style={{ background: opt.color }} />
                                                        {opt.label}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10 }}>
                                    <div style={{ position: 'relative' }}>
                                        <MapPin size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                                        <input className="wizard-input" style={{ paddingLeft: 40 }} type="text" placeholder="CEP *" value={formData.cep} onChange={e => { const val = maskCep(e.target.value); setFormData(p => ({ ...p, cep: val })); if (val.length === 9) fetchAddress(val); }} />
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <input className="wizard-input" type="text" placeholder="Cidade / Estado *" value={formData.location} readOnly style={{ background: 'rgba(255,255,255,0.02)', color: '#94a3b8' }} />
                                    </div>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <input className="wizard-input" type="text" placeholder="Endereço (Rua, Av...) *" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} readOnly={!!formData.address} style={{ background: formData.address ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)', color: formData.address ? '#94a3b8' : '#f1f5f9' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10 }}>
                                    <div style={{ position: 'relative' }}>
                                        <input className="wizard-input" type="text" placeholder="Número *" value={formData.addressNumber} onChange={e => setFormData(p => ({ ...p, addressNumber: e.target.value.replace(/\D/g, '') }))} />
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <input className="wizard-input" type="text" placeholder="Complemento" value={formData.complement} onChange={e => setFormData(p => ({ ...p, complement: e.target.value }))} />
                                    </div>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Linkedin size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                                    <input className="wizard-input" style={{ paddingLeft: 46 }} type="url" placeholder="https://linkedin.com/in/seu-perfil (opcional)" value={formData.linkedin} onChange={e => setFormData(p => ({ ...p, linkedin: e.target.value }))} />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Link size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                                    <input className="wizard-input" style={{ paddingLeft: 46 }} type="url" placeholder="Link do seu portfólio (opcional)" value={formData.portfolio} onChange={e => setFormData(p => ({ ...p, portfolio: e.target.value }))} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                    <button className="wizard-btn-ghost" onClick={() => { setStep(0); triggerStepReveal(); }}>
                                        <ArrowLeft size={14} /> Voltar
                                    </button>
                                    <button className="wizard-btn-primary" disabled={!canAdvanceStep1} onClick={goToNextStep}>
                                        Continuar <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
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

                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '12px', marginBottom: '8px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <input type="checkbox" id="lgpd-terms" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} style={{ marginTop: '4px', cursor: 'pointer', width: '18px', height: '18px', accentColor: '#6366f1' }} />
                                    <label htmlFor="lgpd-terms" style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.5', cursor: 'pointer' }}>
                                        Li e aceito os <button type="button" onClick={(e) => { e.preventDefault(); setShowLGPD(true); }} style={{ background: 'none', border: 'none', color: '#6366f1', textDecoration: 'underline', padding: 0, cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Termos de Privacidade e LGPD</button>. Entendo que meus dados e currículo serão armazenados no banco de talentos para contato sobre processos seletivos.
                                    </label>
                                </div>

                                {/* Honeypot - invisível para humanos, bots preenchem */}
                                <input
                                    type="text"
                                    name="website"
                                    tabIndex={-1}
                                    autoComplete="off"
                                    aria-hidden="true"
                                    style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }}
                                    value={honeypot}
                                    onChange={e => setHoneypot(e.target.value)}
                                />

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                                    <button className="wizard-btn-ghost" onClick={() => { setStep(1); triggerStepReveal(); }}>
                                        <ArrowLeft size={14} /> Voltar
                                    </button>
                                    <button
                                        className="wizard-btn-primary"
                                        disabled={!resumeFile || submitting || !termsAccepted}
                                        onClick={handleSubmit}
                                        style={{ background: submitting ? '#64748b' : '#2C58FD', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}
                                    >
                                        {submitting ? (
                                            <><div style={{ width: 18, height: 18, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Enviando...</>
                                        ) : 'Enviar currículo!'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <p style={{ textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 40 }}>
                    Etapa {step + 1} de {totalSteps}
                </p>
            </main>

            {showLGPD && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '24px'
                }}>
                    <div style={{
                        background: '#1e293b', border: '1px solid #334155', borderRadius: '16px',
                        width: '100%', maxWidth: '600px', maxHeight: '85vh',
                        display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '18px', fontWeight: 700 }}>Termos de Privacidade e LGPD</h2>
                            <button onClick={() => setShowLGPD(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: '24px', overflowY: 'auto', color: '#cbd5e1', fontSize: '14px', lineHeight: '1.6' }}>
                            <p><strong>1. Coleta de Dados</strong><br />Ao enviar seu currículo, coletamos dados pessoais como nome, e-mail, telefone, links profissionais, localização e o arquivo do seu currículo.</p>
                            <p><strong>2. Finalidade</strong><br />Seus dados serão utilizados exclusivamente para fins de recrutamento e seleção para vagas que se encaixem no seu perfil.</p>
                            <p><strong>3. Compartilhamento</strong><br />Seus dados poderão ser compartilhados com recrutadores e gestores da empresa. Não vendemos ou repassamos seus dados a terceiros não autorizados.</p>
                            <p><strong>4. Armazenamento e Segurança</strong><br />Armazenamos suas informações em servidores seguros e adotamos medidas técnicas e administrativas para protegê-las.</p>
                            <p><strong>5. Seus Direitos (LGPD)</strong><br />De acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem o direito de solicitar a visualização, correção ou exclusão dos seus dados a qualquer momento.</p>
                            <p>Ao marcar a caixa de seleção e enviar sua candidatura, você concorda expressamente com os termos descritos acima.</p>
                        </div>
                        <div style={{ padding: '20px 24px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="wizard-btn-primary" onClick={() => setShowLGPD(false)} style={{ padding: '10px 24px', fontSize: '14px' }}>
                                Entendi e Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};