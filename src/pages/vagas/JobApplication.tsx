import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import toast from 'react-hot-toast';
import {
    ArrowLeft, User, Mail, Phone, Linkedin, MapPin, Upload, FileText,
    CheckCircle, AlertCircle, ArrowRight, Sparkles, Heart, Link,
    UserRound, Calendar, ChevronDown
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
            src="/avatar-recrutador.png" 
            alt="Assistant"
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
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

const maskPhone = (val: string, country: { code: string; iso: string }) => {
    let v = val;
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

    const [formData, setFormData] = useState({ 
        name: '', email: '', phone: '', linkedin: '', location: '', portfolio: '',
        cep: '', address: '', addressNumber: '', complement: '',
        gender: '', age: ''
    });
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showLGPD, setShowLGPD] = useState(false);
    

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
        let digits = val.replace(/\D/g, '');
        let currentCountry = selectedCountry;

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
                } else {
                    toast.error('CEP não encontrado.');
                }
            } catch (error) {
                console.error('Error fetching address:', error);
            }
        }
    };

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
                const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-job-detail?hash=${hash}`, {
                    headers: { 
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                    }
                });

                if (!response.ok) {
                    setError('Vaga não encontrada.');
                    return;
                }

                const { job: jobData } = await response.json();
                
                if (!jobData.is_accepting_applications) {
                    setError('Esta vaga não está mais aceitando candidaturas.');
                    return;
                }
                setJob(jobData as Job);
            } catch {
                setError('Vaga não encontrada.');
            } finally {
                setLoading(false);
            }
        };
        fetchJob();
    }, [hash]);




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

            const { error: err } = await supabase.from('vagas_candidaturas').insert({
                vaga_id: job!.id,
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
    const canAdvanceStep1 = 
        formData.email.trim() && 
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
                                                            placeholder="Procurar país..."
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
                                                                Nenhum país encontrado
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
                                                placeholder={selectedCountry.code + ' (00) 00000-0000'}
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
                                            placeholder="Idade" 
                                            value={formData.age} 
                                            onChange={e => setFormData(p => ({ ...p, age: e.target.value }))} 
                                        />
                                    </div>
                                    <div style={{ position: 'relative' }} ref={genderRef}>
                                        <div 
                                            className={`cs-trigger-wizard ${genderOpen ? 'open' : ''}`}
                                            onClick={() => setGenderOpen(!genderOpen)}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <UserRound size={17} style={{ color: '#64748b', flexShrink: 0 }} />
                                                <span style={{ color: formData.gender ? '#f1f5f9' : '#475569' }}>
                                                    {formData.gender || 'Selecione o Gênero'}
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
                                            placeholder="CEP *" 
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
                                            placeholder="Cidade / Estado *" 
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
                                        placeholder="Endereço (Rua, Av...) *" 
                                        value={formData.address} 
                                        onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} 
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10 }}>
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            className="wizard-input" 
                                            type="text" 
                                            placeholder="Número *" 
                                            value={formData.addressNumber} 
                                            onChange={e => setFormData(p => ({ ...p, addressNumber: e.target.value }))} 
                                        />
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            className="wizard-input" 
                                            type="text" 
                                            placeholder="Complemento (ex: Casa 1, Apto 101)" 
                                            value={formData.complement} 
                                            onChange={e => setFormData(p => ({ ...p, complement: e.target.value }))} 
                                        />
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

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                                    <button className="wizard-btn-ghost" onClick={() => { setStep(0); triggerStepReveal(); }}>
                                        <ArrowLeft size={14} /> Voltar
                                    </button>
                                    <button className="wizard-btn-primary" disabled={!canAdvanceStep1} onClick={goToNextStep}>
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

                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '12px', marginBottom: '8px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <input 
                                        type="checkbox" 
                                        id="lgpd-terms" 
                                        checked={termsAccepted} 
                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                        style={{ marginTop: '4px', cursor: 'pointer', width: '18px', height: '18px', accentColor: '#6366f1' }}
                                    />
                                    <label htmlFor="lgpd-terms" style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.5', cursor: 'pointer' }}>
                                        Li e aceito os <button type="button" onClick={(e) => { e.preventDefault(); setShowLGPD(true); }} style={{ background: 'none', border: 'none', color: '#6366f1', textDecoration: 'underline', padding: 0, cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Termos de Privacidade e LGPD</button>. Entendo que meus dados e currículo serão armazenados no banco de talentos para contato sobre processos seletivos.
                                    </label>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                                    <button className="wizard-btn-ghost" onClick={() => { setStep(hasQuestions ? 2 : 1); triggerStepReveal(); }}>
                                        <ArrowLeft size={14} /> Voltar
                                    </button>
                                    <button
                                        className="wizard-btn-primary"
                                        disabled={!resumeFile || submitting || !termsAccepted}
                                        onClick={handleSubmit}
                                        style={{ background: submitting ? '#64748b' : `linear-gradient(135deg, ${primaryColor}, ${gradientEnd})` }}
                                    >
                                        {submitting ? (
                                            <>
                                                <div style={{ width: 18, height: 18, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                                Enviando...
                                            </>
                                        ) : (
                                            "Enviar candidatura!"
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
                            <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '18px', fontWeight: 700 }}>Termos de Privacidade e LGPD</h2>
                            <button onClick={() => setShowLGPD(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: '24px', overflowY: 'auto', color: '#cbd5e1', fontSize: '14px', lineHeight: '1.6' }}>
                            <p><strong>1. Coleta de Dados</strong><br />Ao enviar seu currículo, coletamos dados pessoais como nome, e-mail, telefone, links profissionais, localização e o arquivo do seu currículo.</p>
                            <p><strong>2. Finalidade</strong><br />Seus dados serão utilizados exclusivamente para fins de recrutamento e seleção para a vaga atual e futuras oportunidades que se encaixem no seu perfil.</p>
                            <p><strong>3. Compartilhamento</strong><br />Seus dados poderão ser compartilhados com recrutadores e gestores da empresa responsável pela vaga. Não vendemos ou repassamos seus dados a terceiros não autorizados.</p>
                            <p><strong>4. Armazenamento e Segurança</strong><br />Armazenamos suas informações em servidores seguros e adotamos medidas técnicas e administrativas para protegê-las contra acessos não autorizados.</p>
                            <p><strong>5. Seus Direitos (LGPD)</strong><br />De acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem o direito de solicitar a visualização, correção ou exclusão dos seus dados do nosso banco de talentos a qualquer momento, entrando em contato com a empresa.</p>
                            <p>Ao marcar a caixa de seleção e enviar sua candidatura, você concorda expressamente com os termos descritos acima.</p>
                        </div>
                        <div style={{ padding: '20px 24px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => setShowLGPD(false)}
                                style={{
                                    background: '#6366f1', color: '#fff', border: 'none', padding: '10px 24px',
                                    borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                Entendi e Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
