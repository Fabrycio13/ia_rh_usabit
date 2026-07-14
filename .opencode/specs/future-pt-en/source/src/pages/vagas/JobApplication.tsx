import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import toast from 'react-hot-toast';
import {
    ArrowLeft, User, Mail, Phone, Linkedin, MapPin, Upload, FileText,
    AlertCircle, ArrowRight, Link,
    UserRound, Calendar, ChevronDown, Check
} from 'lucide-react';
import { analyzeJobApplication, type JobMatchResult } from '../../core/services/jobAnalyzer';
import { sanitizeHtml } from '../../core/utils/security';
import { useLang } from '../../core/contexts/LangContext';

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
.typing-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #2C58FD; animation: dots 1.2s infinite ease-in-out; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

body { font-family: 'Space Grotesk', sans-serif; }
h1, h2, h3, h4 { font-family: 'Space Grotesk', sans-serif !important; }

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

/* Custom Select Wizard */
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

const ProgressBar = ({ step, total, labels }: { step: number; total: number; labels: string[] }) => {
    return (
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
            {/* Estilo para animação de pulso */}
            <style>{`
                @keyframes pulse-blue {
                    0% { box-shadow: 0 0 0 0 rgba(44, 88, 253, 0.4); transform: scale(1); }
                    70% { box-shadow: 0 0 0 10px rgba(44, 88, 253, 0); transform: scale(1.05); }
                    100% { box-shadow: 0 0 0 0 rgba(44, 88, 253, 0); transform: scale(1); }
                }
                .active-step {
                    animation: pulse-blue 2s infinite;
                }
            `}</style>

            {/* Linha de fundo (Cinza) */}
            <div style={{ 
                position: 'absolute', 
                top: '20px', 
                left: '40px', 
                right: '40px', 
                height: '2px', 
                background: 'rgba(255, 255, 255, 0.1)', 
                zIndex: 0
            }} />
            
            {/* Linha de progresso (Azul) */}
            <div style={{ 
                position: 'absolute', 
                top: '20px', 
                left: '40px', 
                width: `calc(${(step - 1) / (total - 1)} * (100% - 80px))`, 
                maxWidth: 'calc(100% - 80px)',
                height: '2px', 
                background: '#2C58FD', 
                transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 1
            }} />

            {Array.from({ length: total }).map((_, i) => {
                const isCompleted = i + 1 < step;
                const isActive = i + 1 === step;
                
                return (
                    <div key={i} style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        width: '80px',
                        position: 'relative',
                        zIndex: 2
                    }}>
                        <div 
                            className={isActive ? 'active-step' : ''}
                            style={{ 
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: isCompleted ? '#2C58FD' : '#04070c',
                                border: `2px solid ${isActive || isCompleted ? '#2C58FD' : 'rgba(255, 255, 255, 0.1)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isCompleted ? '#fff' : (isActive ? '#2C58FD' : 'rgba(255, 255, 255, 0.3)'),
                                fontSize: '14px',
                                fontWeight: 700,
                                fontFamily: "'Space Grotesk', sans-serif",
                                transition: 'all 0.4s ease',
                                marginBottom: '16px'
                            }}
                        >
                            {isCompleted ? (
                                <Check size={20} strokeWidth={3} />
                            ) : (
                                i + 1
                            )}
                        </div>
                        <span style={{ 
                            fontSize: '12px', 
                            color: isActive ? '#fff' : isCompleted ? '#fff' : '#C3C7CD',
                            fontWeight: isActive || isCompleted ? 700 : 500,
                            fontFamily: "'Inter', sans-serif",
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.3s'
                        }}>
                            {labels[i]}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

const maskPhone = (val: string, country: { code: string; iso: string }) => {
    const v = val;
    if (!v) return country.code + ' ';

    // Remove tudo que não é dígito, exceto o + inicial
    const clean = v.startsWith('+') ? '+' + v.replace(/\D/g, '') : '+' + v.replace(/\D/g, '');
    const digits = clean.replace(/\D/g, '');
    const codeDigits = country.code.replace(/\D/g, '');
    
    // Extrai a parte local do número
    let localDigits = '';
    if (digits.startsWith(codeDigits)) {
        localDigits = digits.substring(codeDigits.length);
    } else {
        localDigits = digits;
    }

    // Limita a 12 dígitos locais (padrão internacional seguro)
    localDigits = localDigits.substring(0, 12);

    // Máscara Brasil (+55)
    if (country.code === '+55') {
        let res = '+55 ';
        if (localDigits.length > 0) {
            res += '(' + localDigits.substring(0, 2);
            if (localDigits.length > 2) {
                res += ') ' + localDigits.substring(2, 7);
                if (localDigits.length > 7) {
                    res += '-' + localDigits.substring(7, 11);
                }
            }
        }
        return res.trim();
    }

    // Máscara NANP (+1) - EUA, Canadá e Caribe (que não tem prefixo maior)
    if (country.code === '+1') {
        let res = '+1 ';
        if (localDigits.length > 0) {
            res += '(' + localDigits.substring(0, 3);
            if (localDigits.length > 3) {
                res += ') ' + localDigits.substring(3, 6);
                if (localDigits.length > 6) {
                    res += '-' + localDigits.substring(6, 10);
                }
            }
        }
        return res.trim();
    }

    // Máscara Genérica (Europa e outros) - Agrupa de 3 em 3 ou 4 em 4
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

interface AutoResizeEffectProps {
    step: number;
    contentVisible: boolean;
    customAnswers?: Record<string, string>;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

const AutoResizeEffect = ({ step, contentVisible, customAnswers, containerRef }: AutoResizeEffectProps) => {
    useEffect(() => {
        if (!contentVisible) return;
        
        const timer = setTimeout(() => {
            const textareas = containerRef.current?.querySelectorAll('textarea');
            textareas?.forEach((ta) => {
                ta.style.height = 'auto';
                ta.style.height = ta.scrollHeight + 'px';
            });
        }, 100);
        
        return () => clearTimeout(timer);
    }, [step, contentVisible, customAnswers, containerRef]);
    
    return null;
};

export const JobApplication = () => {
    const { t } = useLang();
    const isMobile = window.innerWidth < 768;
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

    const [formData, setFormData] = useState({ 
        name: '', email: '', phone: '', linkedin: '', location: '', portfolio: '',
        cep: '', address: '', addressNumber: '', complement: '',
        gender: '', age: ''
    });
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showLGPD, setShowLGPD] = useState(false);
    const [honeypot, setHoneypot] = useState('');
    

    const [genderOpen, setGenderOpen] = useState(false);
    const genderRef = useRef<HTMLDivElement>(null);
    const [countryOpen, setCountryOpen] = useState(false);
    const countryRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (genderRef.current && !genderRef.current.contains(e.target as Node)) {
                setGenderOpen(false);
            }
            if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
                setCountryOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const countries = [
        // Américas - Sul
        { code: '+55', iso: 'br', name: 'Brasil' },
        { code: '+54', iso: 'ar', name: 'Argentina' },
        { code: '+591', iso: 'bo', name: 'Bolívia' },
        { code: '+56', iso: 'cl', name: 'Chile' },
        { code: '+57', iso: 'co', name: 'Colômbia' },
        { code: '+593', iso: 'ec', name: 'Equador' },
        { code: '+592', iso: 'gy', name: 'Guiana' },
        { code: '+595', iso: 'py', name: 'Paraguai' },
        { code: '+51', iso: 'pe', name: 'Peru' },
        { code: '+597', iso: 'sr', name: 'Suriname' },
        { code: '+598', iso: 'uy', name: 'Uruguai' },
        { code: '+58', iso: 've', name: 'Venezuela' },

        // Américas - Norte
        { code: '+1', iso: 'us', name: 'Estados Unidos' },
        { code: '+1', iso: 'ca', name: 'Canadá' },
        { code: '+52', iso: 'mx', name: 'México' },

        // Américas - Central e Caribe
        { code: '+501', iso: 'bz', name: 'Belize' },
        { code: '+506', iso: 'cr', name: 'Costa Rica' },
        { code: '+503', iso: 'sv', name: 'El Salvador' },
        { code: '+502', iso: 'gt', name: 'Guatemala' },
        { code: '+504', iso: 'hn', name: 'Honduras' },
        { code: '+505', iso: 'ni', name: 'Nicarágua' },
        { code: '+507', iso: 'pa', name: 'Panamá' },
        { code: '+1242', iso: 'bs', name: 'Bahamas' },
        { code: '+1246', iso: 'bb', name: 'Barbados' },
        { code: '+53', iso: 'cu', name: 'Cuba' },
        { code: '+1809', iso: 'do', name: 'Rep. Dominicana' },
        { code: '+509', iso: 'ht', name: 'Haiti' },
        { code: '+1876', iso: 'jm', name: 'Jamaica' },
        { code: '+1868', iso: 'tt', name: 'Trinidad e Tobago' },
        { code: '+1787', iso: 'pr', name: 'Porto Rico' },

        // Europa
        { code: '+351', iso: 'pt', name: 'Portugal' },
        { code: '+34', iso: 'es', name: 'Espanha' },
        { code: '+33', iso: 'fr', name: 'França' },
        { code: '+44', iso: 'gb', name: 'Reino Unido' },
        { code: '+49', iso: 'de', name: 'Alemanha' },
        { code: '+39', iso: 'it', name: 'Itália' },
        { code: '+31', iso: 'nl', name: 'Holanda' },
        { code: '+32', iso: 'be', name: 'Bélgica' },
        { code: '+41', iso: 'ch', name: 'Suíça' },
        { code: '+43', iso: 'at', name: 'Áustria' },
        { code: '+353', iso: 'ie', name: 'Irlanda' },
        { code: '+30', iso: 'gr', name: 'Grécia' },
        { code: '+45', iso: 'dk', name: 'Dinamarca' },
        { code: '+46', iso: 'se', name: 'Suécia' },
        { code: '+47', iso: 'no', name: 'Noruega' },
        { code: '+358', iso: 'fi', name: 'Finlândia' },
        { code: '+48', iso: 'pl', name: 'Polônia' },
        { code: '+7', iso: 'ru', name: 'Rússia' },
        { code: '+90', iso: 'tr', name: 'Turquia' },
        { code: '+380', iso: 'ua', name: 'Ucrânia' },
        { code: '+420', iso: 'cz', name: 'Rep. Tcheca' },
        { code: '+36', iso: 'hu', name: 'Hungria' },
        { code: '+40', iso: 'ro', name: 'Romênia' },
        { code: '+352', iso: 'lu', name: 'Luxemburgo' },
        { code: '+377', iso: 'mc', name: 'Mônaco' },
        { code: '+379', iso: 'va', name: 'Vaticano' },
        { code: '+354', iso: 'is', name: 'Islândia' },
        { code: '+385', iso: 'hr', name: 'Croácia' },
        { code: '+359', iso: 'bg', name: 'Bulgária' },
        { code: '+381', iso: 'rs', name: 'Sérvia' },
        { code: '+421', iso: 'sk', name: 'Eslováquia' },
        { code: '+386', iso: 'si', name: 'Eslovênia' },
        { code: '+370', iso: 'lt', name: 'Lituânia' },
        { code: '+371', iso: 'lv', name: 'Letônia' },
        { code: '+372', iso: 'ee', name: 'Estônia' },

        // Outros Principais
        { code: '+81', iso: 'jp', name: 'Japão' },
        { code: '+86', iso: 'cn', name: 'China' },
        { code: '+61', iso: 'au', name: 'Austrália' },
        { code: '+971', iso: 'ae', name: 'Emirados Árabes' },
        { code: '+972', iso: 'il', name: 'Israel' },
        { code: '+27', iso: 'za', name: 'África do Sul' },
        { code: '+244', iso: 'ao', name: 'Angola' },
        { code: '+258', iso: 'mz', name: 'Moçambique' }
    ];

    const [selectedCountry, setSelectedCountry] = useState(countries[0]);
    const [countrySearch, setCountrySearch] = useState('');

    const normalizeText = (text: string) => 
        text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const filteredCountries = countries.filter(c => {
        const search = normalizeText(countrySearch);
        const name = normalizeText(c.name);
        return name.includes(search) || c.code.includes(search);
    });

    const handlePhoneChange = (val: string) => {
        const digits = val.replace(/\D/g, '');
        let currentCountry: typeof selectedCountry = selectedCountry;

        // Detecção Automática de País por Prefixo ao digitar
        if (val.startsWith('+') || digits.length > 0) {
            const searchVal = val.startsWith('+') ? val : '+' + digits;
            const cleanDigits = searchVal.replace(/\D/g, '');
            
            let found = null;
            // Busca do prefixo mais longo (4 dígitos) para o mais curto (1 dígito)
            for (let len = 4; len >= 1; len--) {
                const prefix = '+' + cleanDigits.substring(0, len);
                found = countries.find(c => c.code === prefix);
                if (found) break;
            }

            // REGRA CRÍTICA: Só muda o país se:
            // 1. O código encontrado for diferente do código atual (ex: mudou de +55 para +1)
            // 2. OU se o código atual for um prefixo parcial do novo código (ex: de +1 para +1868)
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
                    toast.success(t('enderecoEncontrado'));
                } else {
                    toast.error(t('cepNaoEncontrado'));
                }
            } catch (error) {
                console.error('Error fetching address:', error);
            }
        }
    };


    const hasQuestions = (job?.custom_questions?.length ?? 0) > 0;
    const totalSteps = hasQuestions ? 4 : 3;
    const stepLabels = hasQuestions
        ? [t('stepNome'), t('stepContato'), t('stepPerguntas'), t('stepCurriculo')]
        : [t('stepNome'), t('stepContato'), t('stepCurriculo')];

    useEffect(() => {
        const fetchJob = async () => {
            if (!hash) return;
            try {
                const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-job-detail?hash=${hash}`, {
                    headers: { 
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                    }
                });

                if (!response.ok) {
                    setError(t('vagaNaoEncontrada'));
                    return;
                }

                const { job: jobData } = await response.json();
                
                if (!jobData.is_accepting_applications) {
                    setError(t('vagaNaoAceita'));
                    return;
                }
                setJob(jobData as Job);
            } catch {
                setError(t('vagaNaoEncontrada'));
            } finally {
                setLoading(false);
            }
        };
        fetchJob();
    }, [hash, t]);




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
    }, [loading, job, triggerStepReveal]);

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
        if (file.type !== 'application/pdf') { toast.error(t('apenasPDF')); return; }
        if (file.size > 10 * 1024 * 1024) { toast.error(t('arquivoMax10MB')); return; }
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
        
        if (uploadError) { toast.error(t('erroEnviarCurriculo')); return null; }
        const { data: { publicUrl } } = supabase.storage.from('job-applications').getPublicUrl(filePath);
        return publicUrl;
    };

    const handleSubmit = async () => {
        if (!resumeFile) { toast.error(t('enviarCurriculoPDF')); return; }
        if (honeypot) { toast.error(t('erroValidacao')); return; }
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
                portfolio: formData.portfolio,
                cep: formData.cep,
                address: formData.address,
                address_number: formData.addressNumber,
                complement: formData.complement,
                _ai_analysis: aiResult ? {
                    classification: aiResult.classification,
                    summary: aiResult.summary,
                    skills: aiResult.skills,
                    strengths: aiResult.strengths,
                    gaps: aiResult.gaps,
                } : null
            };

            // 1. Salvar na tabela de candidaturas (vínculo com a vaga)
            console.log('[DEBUG] Saving analysis to vagas_candidaturas:', {
                hasAiResult: !!aiResult,
                match_score: aiResult?.score,
                hasAiAnalysis: !!finalAnswers._ai_analysis,
                aiKeys: finalAnswers._ai_analysis ? Object.keys(finalAnswers._ai_analysis as object) : 'n/a'
            });

            const submitRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-application`, {
                method: 'POST',
                headers: {
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    vaga_id: job!.id,
                    organization_id: job!.organization_id,
                    candidate_name: formData.name,
                    candidate_email: formData.email,
                    candidate_phone: formData.phone || null,
                    candidate_location: formData.location || null,
                    candidate_linkedin: formData.linkedin || null,
                    candidate_gender: formData.gender || null,
                    candidate_age: formData.age || null,
                    resume_url: resumeUrl,
                    resume_file_name: resumeFile.name,
                    status: aiResult ? 'reviewed' : 'pending',
                    match_score: aiResult ? aiResult.score : 0,
                    source: 'public_link',
                    answers: finalAnswers,
                })
            });

            if (!submitRes.ok) {
                const errBody = await submitRes.text();
                console.error('submit-application error:', submitRes.status, errBody);
                throw new Error('Erro ao enviar candidatura');
            }

            const submitData = await submitRes.json();
            const applicationId = submitData.id;

            setSubmitted(true);

            // Enviar e-mail de confirmação via Supabase Edge Function
            try {
                await supabase.functions.invoke('send-application-email', {
                    body: {
                        applicationId: applicationId,
                    }
                });
            } catch (emailErr) {
                console.error("Erro ao enviar email de confirmação:", emailErr);
            }

        } catch {
            toast.error(t('erroEnviarCandidatura'));
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
                    <p style={{ color: '#94a3b8', fontSize: '14px' }}>{t('carregando')}</p>
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
                    <h1 style={{ color: '#f1f5f9', fontSize: 28, fontWeight: 700, marginBottom: 12 }}>{error || t('vagaNaoEncontrada')}</h1>
                    <button className="wizard-btn-primary" onClick={() => navigate(-1)}>{t('voltar')}</button>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div style={{ 
                minHeight: '100vh', 
                background: '#04070c', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                padding: '24px',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: "'Space Grotesk', sans-serif"
            }}>
                <style>{CSS}</style>

                {/* Background Gradient SVG - Site Panel Pattern Sync */}
                <div style={{ 
                    position: 'absolute', top: 0, right: 0, width: '70%', height: '100%', 
                    pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
                    background: 'radial-gradient(53.74% 45.93% at 100% 50%, rgba(44, 88, 253, 0.15) 0%, rgba(26, 53, 151, 0) 100%)',
                    filter: 'blur(40px)'
                }}>
                    <svg width="2122" height="1434" viewBox="-1350 0 2122 1434" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', top: 0, right: '-20%', height: '120%', width: 'auto', opacity: 0.4 }}>
                        <path d="M-1304.14 405.498C-1197.64 48.9343 -644.279 -100.653 -68.1689 71.3844C507.941 243.422 888.637 671.939 782.139 1028.5C675.642 1385.07 122.279 1534.65 -453.831 1362.62C-1029.94 1190.58 -1410.64 762.061 -1304.14 405.498Z" fill="url(#paint_success_glow)"/>
                        <defs>
                            <radialGradient id="paint_success_glow" cx="0" cy="0" r="1" gradientTransform="matrix(192.831 -645.616 1043.14 311.502 -261 717)" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#2C58FD"/>
                                <stop offset="1" stopColor="#1A3597" stopOpacity="0"/>
                            </radialGradient>
                        </defs>
                    </svg>
                </div>

                <div style={{ textAlign: 'center', maxWidth: '480px', animation: 'fadeSlideUp 0.6s ease-out', position: 'relative', zIndex: 1 }}>
                    <div style={{ margin: '0 auto 32px', display: 'flex', justifyContent: 'center' }}>
                        <svg width="64" height="80" viewBox="0 0 64 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M40 4V20C40 21.0609 40.4214 22.0783 41.1716 22.8284C41.9217 23.5786 42.9391 24 44 24H60M40 4H12C9.87827 4 7.84344 4.84285 6.34315 6.34315C4.84285 7.84344 4 9.87827 4 12V68C4 70.1217 4.84285 72.1566 6.34315 73.6569C7.84344 75.1571 9.87827 76 12 76H52C54.1217 76 56.1566 75.1571 57.6569 73.6569C59.1571 72.1566 60 70.1217 60 68V24M40 4L60 24M20 52L28 60L44 44" stroke="#22c55e" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>

                    <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>
                        {t('candidaturaEnviadaTitulo')}
                    </h2>
                    
                    <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '1.6', marginBottom: '32px' }}>
                        {t('candidaturaRecebida')} <strong style={{ color: '#fff' }}>{job.title}</strong>!<br /><br />
                        {t('boaSorte')}, {formData.name.split(' ')[0]}{t('torcemosVagaCerta')} 🍀<br /><br />
                        {t('agradecemosInteresse')}
                    </p>

                    <button 
                        onClick={() => {
                            if (job.organization_id) {
                                navigate(`/carreiras/${job.organization_id}`);
                            } else {
                                navigate(`/v/${hash}`);
                            }
                        }}
                        className="wizard-btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                    >
                        {t('voltarPortal')}
                    </button>
                </div>
            </div>
        );
    }

    const firstName = formData.name.trim().split(' ')[0];

    const stepMessages: Record<number, { bubble: string }> = {
        0: {
            bubble: t('bubbleStep0').replace('{jobTitle}', job.title).replace('{company}', job.company_name ? t('bubbleStep0Suffix') + job.company_name : '')
        },
        1: {
            bubble: t('bubbleStep1').replace('{name}', firstName)
        },
        2: {
            bubble: t('bubbleStep2').replace('{name}', firstName)
        },
        3: {
            bubble: t('bubbleStep3').replace('{name}', firstName)
        },
    };

    const msg = stepMessages[step];

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
    const canAdvanceStep2 = (() => {
        if (!job.custom_questions) return true;
        for (const q of job.custom_questions) {
            if (q.logic?.parentId && customAnswers[q.logic.parentId] !== q.logic.parentValue) continue;
            if (q.required && !customAnswers[q.id]?.trim()) return false;
        }
        return true;
    })();

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: '#04070c', 
            color: '#fff', 
            position: 'relative',
            overflowX: 'hidden',
            fontFamily: "'Manrope', sans-serif"
        }}>
            <style>{CSS}</style>

            {/* Background Gradient SVG - Site Panel Pattern */}
            <div style={{ 
                position: 'fixed', 
                top: 0, 
                right: 0, 
                width: '70%', 
                height: '100%', 
                pointerEvents: 'none', 
                zIndex: 0, 
                overflow: 'hidden',
                background: 'radial-gradient(53.74% 45.93% at 100% 50%, rgba(44, 88, 253, 0.15) 0%, rgba(26, 53, 151, 0) 100%)',
                filter: 'blur(40px)'
            }}>
                <svg width="2122" height="1434" viewBox="-1350 0 2122 1434" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', top: 0, right: '-20%', height: '120%', width: 'auto', opacity: 0.4 }}>
                    <path d="M-1304.14 405.498C-1197.64 48.9343 -644.279 -100.653 -68.1689 71.3844C507.941 243.422 888.637 671.939 782.139 1028.5C675.642 1385.07 122.279 1534.65 -453.831 1362.62C-1029.94 1190.58 -1410.64 762.061 -1304.14 405.498Z" fill="url(#paint0_radial_apply_ultra)"/>
                    <defs>
                        <radialGradient id="paint0_radial_apply_ultra" cx="0" cy="0" r="1" gradientTransform="matrix(192.831 -645.616 1043.14 311.502 -261 717)" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#2C58FD"/>
                            <stop offset="1" stopColor="#1A3597" stopOpacity="0"/>
                        </radialGradient>
                    </defs>
                </svg>
            </div>

            {/* Header com Progresso - Transparente para unificar fundo */}
            <header style={{ 
                background: 'transparent', 
                backdropFilter: 'blur(10px)',
                padding: isMobile ? '20px 24px 10px' : '40px 24px 20px',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                textAlign: 'center'
            }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <h1 style={{ 
                        fontSize: '36px', 
                        fontWeight: 700, 
                        margin: '0 0 8px', 
                        fontFamily: "'Space Grotesk', sans-serif",
                        letterSpacing: '-0.02em',
                        color: '#ffffff'
                    }}>
                        {t('candidatoSeVaga')}
                    </h1>
                    <p style={{ 
                        color: '#2C58FD', 
                        fontSize: '16px', 
                        fontWeight: 600, 
                        marginBottom: isMobile ? '16px' : '24px',
                        fontFamily: "'Space Grotesk', sans-serif",
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        {job.title}
                    </p>
                    
                    <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                        <ProgressBar step={step + 1} total={totalSteps} labels={stepLabels} />
                    </div>
                </div>
            </header>

            {/* Auto-resize Effect */}
            <AutoResizeEffect step={step} contentVisible={contentVisible} customAnswers={customAnswers} containerRef={containerRef} />

            <main 
                ref={containerRef}
                style={{ 
                    maxWidth: '640px', 
                    margin: '0 auto', 
                    padding: isMobile ? '0px 24px 120px' : '10px 24px 120px',
                    position: 'relative',
                    zIndex: 1,
                    fontFamily: "'Inter', sans-serif",
                    color: '#C3C7CD'
                }}
            >

                {showTyping && (
                    <div style={{ marginTop: 24, animation: 'fadeSlideDown 0.3s ease-out' }}>
                        <TypingIndicator />
                    </div>
                )}

                {contentVisible && (
                    <div style={{ marginTop: 24, animation: 'fadeSlideUp 0.5s ease-out' }}>

                        {/* Bot Message */}
                        {msg && (
                            <div style={{ marginBottom: 16 }}>
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
                                        placeholder={t('seuNomeCompleto')}
                                        value={formData.name}
                                        onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && canAdvanceStep0 && goToNextStep()}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                    <button 
                                        className="wizard-btn-ghost" 
                                        onClick={() => navigate(-1)}
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '8px',
                                            color: '#ef4444',
                                            borderColor: 'rgba(239, 68, 68, 0.2)'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                                        }}
                                    >
                                        <ArrowLeft size={14} /> {t('voltarVaga')}
                                    </button>
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
                                    <input autoFocus className={`wizard-input${isEmailInvalid ? ' error' : ''}`} style={{ paddingLeft: 46 }} type="email" placeholder={`${t('seuEmail')} *`} value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                                </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <div style={{ position: 'relative' }} ref={countryRef}>
                                            <div 
                                                className={`cs-trigger-wizard ${countryOpen ? 'open' : ''}`}
                                                style={{ width: '85px', height: '51px', padding: '0 12px' }}
                                                onClick={() => setCountryOpen(!countryOpen)}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: '100%' }}>
                                                    <img 
                                                        src={`https://flagcdn.com/w40/${selectedCountry.iso}.png`}
                                                        srcSet={`https://flagcdn.com/w80/${selectedCountry.iso}.png 2x`}
                                                        width="24"
                                                        alt={selectedCountry.name}
                                                        style={{ borderRadius: '3px', flexShrink: 0 }}
                                                    />
                                                    <ChevronDown size={14} style={{ color: '#64748b', opacity: 0.8 }} />
                                                </div>
                                            </div>

                                            {countryOpen && (
                                                <div className="cs-dropdown-wizard">
                                                    <div className="cs-search-wrapper">
                                                        <input 
                                                            autoFocus
                                                            className="cs-search-input"
                                                            placeholder={t('selecionePais')}
                                                            value={countrySearch}
                                                            onChange={e => setCountrySearch(e.target.value)}
                                                            onClick={e => e.stopPropagation()}
                                                        />
                                                    </div>
                                                    <div className="cs-dropdown-items-wrapper">
                                                        {filteredCountries.map(c => (
                                                            <div 
                                                                key={c.iso + c.code}
                                                                className={`cs-item-wizard ${selectedCountry.iso === c.iso && selectedCountry.code === c.code ? 'active' : ''}`}
                                                                onClick={() => {
                                                                    setSelectedCountry(c);
                                                                    setCountryOpen(false);
                                                                    setCountrySearch('');
                                                                    setFormData(p => ({ ...p, phone: c.code + ' ' }));
                                                                }}
                                                            >
                                                                <img 
                                                                    src={`https://flagcdn.com/w40/${c.iso}.png`}
                                                                    width="22"
                                                                    alt={c.name}
                                                                    style={{ borderRadius: '2px', flexShrink: 0 }}
                                                                />
                                                                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                                                                    <span style={{ fontSize: '14px', color: '#f1f5f9' }}>{c.name}</span>
                                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>{c.code}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {filteredCountries.length === 0 && (
                                                            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                                                                {t('nenhumPaisEncontrado')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ position: 'relative', flex: 1 }}>
                                            <Phone size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
<input 
                                            className="wizard-input" 
                                            style={{ paddingLeft: 46 }} 
                                            type="tel" 
                                            placeholder={selectedCountry.code + ' ' + t('placeholderTelefone')}
                                            value={formData.phone} 
                                            onChange={e => handlePhoneChange(e.target.value)} 
                                        />
                                        </div>
                                    </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
                                    <div style={{ position: 'relative' }}>
                                        <Calendar size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                                        <input 
                                            className="wizard-input" 
                                            style={{ paddingLeft: 46 }} 
                                            type="text" 
                                            placeholder={t('placeholderIdade')} 
                                            value={formData.age} 
                                            onChange={e => {
                                                let val = e.target.value.replace(/\D/g, '');
                                                if (val.length > 2) val = val.slice(0, 2);
                                                setFormData(p => ({ ...p, age: val }));
                                            }} 
                                        />
                                    </div>
                                    <div style={{ position: 'relative' }} ref={genderRef}>
                                        <div
                                            tabIndex={0}
                                            className={`cs-trigger-wizard ${genderOpen ? 'open' : ''}`}
                                            onClick={() => setGenderOpen(!genderOpen)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setGenderOpen(!genderOpen); }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <UserRound size={17} style={{ color: '#64748b', flexShrink: 0 }} />
                                                <span style={{ color: formData.gender ? '#f1f5f9' : '#475569' }}>
                                                    {formData.gender || t('selecioneGenero')}
                                                </span>
                                            </div>
                                            <ChevronDown size={16} style={{ color: '#64748b', transform: genderOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                        </div>

                                        {genderOpen && (
                                            <div className="cs-dropdown-wizard">
                                                {genderOptions.map(opt => (
                                                    <div 
                                                        key={opt.value}
                                                        className={`cs-item-wizard ${formData.gender === opt.value ? 'active' : ''}`}
                                                        onClick={() => {
                                                            setFormData(p => ({ ...p, gender: opt.value }));
                                                            setGenderOpen(false);
                                                        }}
                                                    >
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
<input 
                                            className="wizard-input" 
                                            style={{ paddingLeft: 40 }} 
                                            type="text" 
                                            placeholder={`${t('placeholderCep')} *`} 
                                            value={formData.cep}
                                            onChange={e => {
                                                const val = maskCep(e.target.value);
                                                setFormData(p => ({ ...p, cep: val }));
                                                if (val.length === 9) fetchAddress(val);
                                            }} 
                                        />
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            className="wizard-input" 
                                            type="text" 
                                            placeholder={`${t('placeholderCidadeEstado')} *`} 
                                            value={formData.location} 
                                            readOnly
                                            style={{ background: 'rgba(255,255,255,0.02)', color: '#94a3b8' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ position: 'relative' }}>
                                    <input 
                                        className="wizard-input" 
                                        type="text" 
                                        placeholder={`${t('placeholderEndereco')} *`} 
                                        value={formData.address} 
                                        onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} 
                                        readOnly={!!formData.address}
                                        style={{ 
                                            background: formData.address ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)', 
                                            color: formData.address ? '#94a3b8' : '#f1f5f9' 
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10 }}>
                                    <div style={{ position: 'relative' }}>
<input 
                                        className="wizard-input" 
                                        type="text" 
                                        placeholder={`${t('placeholderNumero')} *`} 
                                        value={formData.addressNumber}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                setFormData(p => ({ ...p, addressNumber: val }));
                                            }} 
                                        />
                                    </div>
                                    <div style={{ position: 'relative' }}>
<input 
                                        className="wizard-input" 
                                        type="text" 
                                        placeholder={t('placeholderComplemento')} 
                                        value={formData.complement}
                                            onChange={e => setFormData(p => ({ ...p, complement: e.target.value }))} 
                                        />
                                    </div>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Linkedin size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                                    <input className="wizard-input" style={{ paddingLeft: 46 }} type="url" placeholder={t('placeholderLinkedin')} value={formData.linkedin} onChange={e => setFormData(p => ({ ...p, linkedin: e.target.value }))} />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Link size={17} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                                    <input className="wizard-input" style={{ paddingLeft: 46 }} type="url" placeholder={t('placeholderPortfolio')} value={formData.portfolio} onChange={e => setFormData(p => ({ ...p, portfolio: e.target.value }))} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                    <button 
                                        className="wizard-btn-ghost" 
                                        onClick={() => { setStep(0); triggerStepReveal(); }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <ArrowLeft size={14} /> {t('voltar')}
                                    </button>
                                    <button className="wizard-btn-primary" disabled={!canAdvanceStep1} onClick={goToNextStep}>
                                        {t('continuar')} <ArrowRight size={16} />
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
                                                <input 
                                                    className="wizard-input" 
                                                    type="text" 
                                                    placeholder={t('suaResposta')} 
                                                    value={customAnswers[q.id] || ''} 
                                                    onChange={e => {
                                                        let val = e.target.value;
                                                        if (q.id === '__salary_expectation__') {
                                                            val = val.replace(/\D/g, '');
                                                            if (val) val = (parseInt(val) / 100).toFixed(2).replace('.', ',');
                                                        }
                                                        setCustomAnswers(p => ({ ...p, [q.id]: val }));
                                                    }} 
                                                />
                                            )}

                                            {q.type === 'paragraph' && (
<textarea 
                                                className="wizard-input hide-scrollbar" 
                                                placeholder={t('suaRespostaDetalhada')} 
                                                rows={1}
                                                    value={customAnswers[q.id] || ''} 
                                                    onChange={e => {
                                                        setCustomAnswers(p => ({ ...p, [q.id]: e.target.value }));
                                                        e.target.style.height = 'auto';
                                                        e.target.style.height = e.target.scrollHeight + 'px';
                                                    }} 
                                                    style={{ 
                                                        resize: 'none', 
                                                        lineHeight: '1.6', 
                                                        paddingTop: 12, 
                                                        paddingBottom: 12,
                                                        overflow: 'hidden',
                                                        minHeight: '52px'
                                                    }} 
                                                />
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
                                                            <label style={{ display: 'block', color: '#6366f1', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{q.complementaryLabel || t('podeDetalhar')}</label>
                                                            <textarea 
                                                                className="wizard-input hide-scrollbar" 
                                                                rows={1} 
                                                                placeholder={t('digiteAqui')} 
                                                                value={customAnswers[`${q.id}_extra`] || ''} 
                                                                onChange={e => {
                                                                    setCustomAnswers(p => ({ ...p, [`${q.id}_extra`]: e.target.value }));
                                                                    e.target.style.height = 'auto';
                                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                                }} 
                                                                style={{ 
                                                                    resize: 'none', 
                                                                    lineHeight: '1.6', 
                                                                    paddingTop: 10, 
                                                                    paddingBottom: 10,
                                                                    overflow: 'hidden',
                                                                    minHeight: '44px'
                                                                }} 
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                    <button className="wizard-btn-ghost" onClick={() => { setStep(1); triggerStepReveal(); }}>
                                        <ArrowLeft size={14} /> {t('voltar')}
                                    </button>
                                    <button className="wizard-btn-primary" disabled={!canAdvanceStep2} onClick={goToNextStep}>
                                        {t('continuar')} <ArrowRight size={16} />
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
                                                <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{(resumeFile.size / 1024 / 1024).toFixed(2)} MB • {t('cliqueParaTrocar')}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Upload size={26} style={{ color: '#64748b' }} />
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ color: '#cbd5e1', fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>{t('cliqueEnviarCurriculo')}</p>
                                                <p style={{ color: '#475569', fontSize: 12, margin: 0 }}>{t('pdfMax10MB')}</p>
                                            </div>
                                        </>
                                    )}
                                </button>

                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '12px', marginBottom: '8px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <input 
                                        type="checkbox" 
                                        id="lgpd-terms" 
                                        checked={termsAccepted} 
                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                        style={{ marginTop: '4px', cursor: 'pointer', width: '18px', height: '18px', accentColor: '#6366f1' }}
                                    />
                                    <label htmlFor="lgpd-terms" style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.5', cursor: 'pointer' }}>
                                        {t('aceitarTermosLGPD')} <button type="button" onClick={(e) => { e.preventDefault(); setShowLGPD(true); }} style={{ background: 'none', border: 'none', color: '#6366f1', textDecoration: 'underline', padding: 0, cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>{t('termosPrivacidadeLGPD')}</button>{t('termosLGPDAcceptDesc')}
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
                                    <button className="wizard-btn-ghost" onClick={() => { setStep(hasQuestions ? 2 : 1); triggerStepReveal(); }}>
                                        <ArrowLeft size={14} /> {t('voltar')}
                                    </button>
                                    <button
                                        className="wizard-btn-primary"
                                        disabled={!resumeFile || submitting || !termsAccepted}
                                        onClick={handleSubmit}
                                        style={{ 
                                            background: submitting ? '#64748b' : '#2C58FD',
                                            width: isMobile ? '100%' : 'auto',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        {submitting ? (
                                            <>
                                                <div style={{ width: 18, height: 18, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                                {t('enviando')}
                                            </>
                                        ) : (
                                            t('enviarCandidaturaBtn')
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <p style={{ textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 40 }}>
                    {t('etapaXdeY').replace('{x}', String(step + 1)).replace('{y}', String(totalSteps))}
                </p>
            </main>
            
            {/* LGPD Modal */}
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
                            <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '18px', fontWeight: 700 }}>{t('termosLGPDTitulo')}</h2>
                            <button onClick={() => setShowLGPD(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: '24px', overflowY: 'auto', color: '#cbd5e1', fontSize: '14px', lineHeight: '1.6' }}>
                            <p><strong>{t('termosLGPD1Titulo')}</strong><br />{t('termosLGPD1Desc')}</p>
                            <p><strong>{t('termosLGPD2Titulo')}</strong><br />{t('termosLGPD2Desc')}</p>
                            <p><strong>{t('termosLGPD3Titulo')}</strong><br />{t('termosLGPD3Desc')}</p>
                            <p><strong>{t('termosLGPD4Titulo')}</strong><br />{t('termosLGPD4Desc')}</p>
                            <p><strong>{t('termosLGPD5Titulo')}</strong><br />{t('termosLGPD5Desc')}</p>
                            <p>{t('termosLGPD6Desc')}</p>
                        </div>
                        <div style={{ padding: '20px 24px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                className="wizard-btn-primary"
                                onClick={() => setShowLGPD(false)}
                                style={{ padding: '10px 24px', fontSize: '14px' }}
                            >
                                {t('entendiFechar')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
