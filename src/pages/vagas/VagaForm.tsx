import { useState, useEffect, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../core/contexts/ThemeContext';
import { supabase } from '../../core/services/supabase';
import toast from 'react-hot-toast';
import { 
    ArrowLeft, Save, X, FileText, Target, Award, Star, Info, 
    DollarSign, MapPin, Building2, Clock, Kanban, Plus, Trash2, Settings, 
    List, Type, CheckCircle2, GripVertical, Zap
} from 'lucide-react';
import { StepIndicator } from './components/StepIndicator';
import { logActivity } from '../../core/services/logger';
import { ToggleField } from './components/ToggleField';
import { RadioGroup } from './components/RadioGroup';
import { CityAutocomplete } from './components/CityAutocomplete';

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
@keyframes dashFadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
@keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.1); } }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes iconFloat {
    0%, 100% { transform: translateY(0) scale(1); box-shadow: 0 12px 40px rgba(99, 102, 241, 0.25); }
    50% { transform: translateY(-12px) scale(1.05); box-shadow: 0 20px 60px rgba(99, 102, 241, 0.45); }
}
.star { position: absolute; background: white; border-radius: 50%; pointer-events: none; animation: twinkle var(--duration) ease-in-out infinite; opacity: 0.6; }
.planet { position: absolute; border-radius: 50%; pointer-events: none; z-index: 0; filter: blur(1px); box-shadow: inset -10px -10px 20px rgba(0,0,0,0.3), 0 0 20px rgba(255,255,255,0.1); }
.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.animated-icon-container { animation: iconFloat 4s ease-in-out infinite; }
`;

// ─── Planet Overlay Component ─────────────────────────────────────────────────
const PlanetOverlay = memo(({ type }: { type: string }) => {
  switch (type) {
    case 'Jupiter':
      return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, transparent, transparent 12px, rgba(124,45,18,0.25) 12px, rgba(124,45,18,0.25) 24px)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, transparent, transparent 18px, rgba(254,243,199,0.15) 18px, rgba(254,243,199,0.15) 36px)' }} />
          <div style={{ position: 'absolute', top: '65%', left: '15%', width: '25%', height: '12%', borderRadius: '50%', background: 'rgba(124,45,18,0.45)', filter: 'blur(2px)', transform: 'rotate(-3deg)' }} />
          <div style={{ position: 'absolute', top: '30%', left: '55%', width: '28%', height: '6%', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', filter: 'blur(1px)' }} />
        </div>
      );
    case 'Earth':
      return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0,
            backgroundImage: `
              radial-gradient(ellipse 22px 18px at 25% 30%, #166534 0%, transparent 100%),
              radial-gradient(ellipse 30px 22px at 65% 55%, #15803d 0%, transparent 100%),
              radial-gradient(ellipse 18px 12px at 45% 45%, #3f6212 0%, transparent 100%),
              radial-gradient(ellipse 12px 08px at 80% 20%, #14532d 0%, transparent 100%),
              radial-gradient(circle 7px at 22% 72%, #166534 0%, transparent 100%)
            `,
            opacity: 0.85, filter: 'blur(1px)'
          }} />
          <div style={{ position: 'absolute', top: '22%', left: '22%', width: '18%', height: '18%', background: 'rgba(255,255,255,0.3)', borderRadius: '50%', filter: 'blur(5px)' }} />
          <div style={{ position: 'absolute', inset: 0,
            backgroundImage: 'repeating-conic-gradient(from 0deg, rgba(255,255,255,0.08) 0deg, transparent 45deg, rgba(255,255,255,0.08) 90deg)',
            filter: 'blur(2px)', animation: 'float 30s linear infinite'
          }} />
        </div>
      );
    case 'Moon':
      return (
        <div style={{ position: 'absolute', inset: 0, opacity: 0.7 }}>
          <div style={{ position: 'absolute', top: '15%', left: '25%', width: '18%', height: '18%', borderRadius: '50%', background: 'rgba(0,0,0,0.2)', boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.3)' }} />
          <div style={{ position: 'absolute', top: '45%', left: '60%', width: '15%', height: '15%', borderRadius: '50%', background: 'rgba(0,0,0,0.2)', boxShadow: 'inset 2px 2px 3px rgba(0,0,0,0.3)' }} />
          <div style={{ position: 'absolute', top: '70%', left: '30%', width: '22%', height: '22%', borderRadius: '50%', background: 'rgba(0,0,0,0.15)', boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.25)' }} />
        </div>
      );
    case 'Mars':
      return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '15%', left: '15%', width: '35%', height: '15%', background: 'rgba(69,10,10,0.35)', filter: 'blur(4px)', transform: 'rotate(-5deg)' }} />
          <div style={{ position: 'absolute', top: '65%', left: '50%', width: '25%', height: '15%', background: 'rgba(69,10,10,0.3)', filter: 'blur(3px)', transform: 'rotate(10deg)' }} />
          <div style={{ position: 'absolute', top: '35%', left: '55%', width: '15%', height: '15%', borderRadius: '50%', background: 'rgba(69,10,10,0.2)', boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.3)' }} />
        </div>
      );
    case 'Neptune':
      return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(160deg, transparent, transparent 8px, rgba(255,255,255,0.08) 8px, rgba(255,255,255,0.08) 16px)', filter: 'blur(1.5px)', animation: 'float 45s linear infinite' }} />
          <div style={{ position: 'absolute', top: '40%', left: '10%', width: '80%', height: '4%', background: 'rgba(255,255,255,0.15)', filter: 'blur(3px)' }} />
        </div>
      );
    case 'Venus':
      return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.12) 0%, transparent 60%)', filter: 'blur(2px)' }} />
          <div style={{ position: 'absolute', inset: -10, background: 'repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(0,0,0,0.05) 12px, rgba(0,0,0,0.05) 24px)', filter: 'blur(4px)', opacity: 0.4 }} />
        </div>
      );
    case 'Saturn':
      return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.1) 50%, transparent)' }} />
          <div style={{ position: 'absolute', top: '25%', left: '10%', width: '80%', height: '10%', background: 'rgba(255,255,255,0.05)', filter: 'blur(1px)' }} />
        </div>
      );
    default:
      return null;
  }
});

interface VagaFormData {
    // Step 1: Basic Info
    title: string;
    description: string;
    
    // Step 2: Job Details
    hasSalaryRange: boolean;
    salaryMin: string;
    salaryMax: string;
    contractType: string;
    hasLocation: boolean;
    location: string;
    neighborhood: string;
    workModel: string;
    workRegime: string;
    isPcd: string;

    // Step 3: Content
    responsibilities: string;
    requirements: string;
    differentials: string;
    additionalInfo: string;
    category: string;
    initialStatus: 'aberta' | 'invisivel' | 'fechada';
    
    // External Client Info (RPO/Agency)
    isThirdParty: boolean;
    companyName: string;
    companyLogo: string;
    showCompanyName: boolean;

    // Design Visual (por vaga)
    vagaPrimaryColor: string;
    vagaGradientEnd: string;
    vagaBgColor: string;
    vagaBgImage: string;

    customQuestions: {
        id: string;
        label: string;
        type: 'text' | 'paragraph' | 'choice';
        options?: string[];
        required: boolean;
        logic?: {
            parentId: string;
            parentValue: string;
        };
        hasComplementary?: boolean;
        complementaryTrigger?: string;
        complementaryLabel?: string;
    }[];
}

const initialFormData: VagaFormData = {
    title: '',
    description: '',
    hasSalaryRange: false,
    salaryMin: '',
    salaryMax: '',
    contractType: '',
    hasLocation: false,
    location: '',
    neighborhood: '',
    workModel: '',
    workRegime: '',
    isPcd: 'no',
    responsibilities: '',
    requirements: '',
    differentials: '',
    additionalInfo: '',
    category: '',
    initialStatus: 'aberta',
    isThirdParty: false,
    companyName: '',
    companyLogo: '',
    showCompanyName: true,
    vagaPrimaryColor: '',
    vagaGradientEnd: '',
    vagaBgColor: '',
    vagaBgImage: '',
    customQuestions: [],
};

export const VagaForm = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;
    const { bgTheme } = useTheme();
    
    
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<VagaFormData>(initialFormData);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(isEditMode);
    const [jobCode, setJobCode] = useState<string | null>(null);
    const [showPipelineModal, setShowPipelineModal] = useState(false);
    const [createdVagaId, setCreatedVagaId] = useState<string | null>(null);
    const [creatingPipeline, setCreatingPipeline] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const check = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
        check(mq);
        mq.addEventListener('change', check);
        return () => mq.removeEventListener('change', check);
    }, []);

    // Carregar dados da vaga se estiver editando
    useEffect(() => {
        if (!isEditMode || !id) return;

        const fetchVaga = async () => {
            try {
                console.log('Buscando vaga com ID:', id);
                
                const { data, error } = await supabase
                    .from('vagas_white_label')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) {
                    console.error('Erro ao buscar vaga:', error);
                    throw error;
                }
                if (!data) {
                    toast.error('Vaga não encontrada');
                    navigate('/vagas');
                    return;
                }

                console.log('Dados da vaga carregados:', data);

                const fullLocation = data.location || '';
                const locationParts = fullLocation.split(' - ');

                setFormData({
                    title: data.title || '',
                    description: data.description || '',
                    hasSalaryRange: data.has_salary_range || false,
                    salaryMin: data.salary_min ? data.salary_min.toString() : '',
                    salaryMax: data.salary_max ? data.salary_max.toString() : '',
                    contractType: data.contract_type || '',
                    hasLocation: data.has_location || false,
                    location: locationParts[0] || '',
                    neighborhood: locationParts[1] || '',
                    workModel: data.work_model || '',
                    workRegime: data.work_regime || '',
                    isPcd: data.is_pcd || 'no',
                    responsibilities: data.responsibilities || '',
                    requirements: data.requirements || '',
                    differentials: data.differentials || '',
                    additionalInfo: data.additional_info || '',
                    category: data.category || '',
                    initialStatus: (data.status as 'aberta' | 'fechada' | 'invisivel') || 'aberta',
                    isThirdParty: data.is_third_party || !!data.company_name,
                    companyName: data.company_name || '',
                    companyLogo: data.company_logo || '',
                    showCompanyName: data.show_company_name !== false,
                    vagaPrimaryColor: data.vaga_primary_color || '',
                    vagaGradientEnd: data.vaga_gradient_end || '',
                    vagaBgColor: data.vaga_bg_color || '',
                    vagaBgImage: data.vaga_bg_image || '',
                    customQuestions: data.custom_questions || [],
                });
                setJobCode(data.job_code || null);
            } catch (err) {
                console.error('Erro ao carregar vaga:', err);
                toast.error('Erro ao carregar vaga');
                navigate('/vagas');
            } finally {
                setLoading(false);
            }
        };

        fetchVaga();
    }, [id, isEditMode, navigate]);

    const updateField = <K extends keyof VagaFormData>(field: K, value: VagaFormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addQuestion = () => {
        const newQuestion: VagaFormData['customQuestions'][0] = {
            id: Math.random().toString(36).substring(2, 11),
            label: '',
            type: 'text',
            required: true,
        };
        updateField('customQuestions', [...formData.customQuestions, newQuestion]);
    };

    const removeQuestion = (id: string) => {
        const updatedQuestions = formData.customQuestions
            .filter(q => q.id !== id)
            .map(q => {
                if (q.logic?.parentId === id) {
                    const { logic, ...rest } = q;
                    void logic;
                    return rest;
                }
                return q;
            });
        updateField('customQuestions', updatedQuestions);
    };

    const updateQuestion = (id: string, updates: Partial<VagaFormData['customQuestions'][0]>) => {
        updateField('customQuestions', formData.customQuestions.map(q => q.id === id ? { ...q, ...updates } : q));
    };

    const addOption = (questionId: string) => {
        const question = formData.customQuestions.find(q => q.id === questionId);
        if (question) {
            const options = question.options || [];
            updateQuestion(questionId, { options: [...options, ''] });
        }
    };

    const removeOption = (questionId: string, index: number) => {
        const question = formData.customQuestions.find(q => q.id === questionId);
        if (question) {
            const options = (question.options || []).filter((_, i) => i !== index);
            updateQuestion(questionId, { options });
        }
    };

    const updateOption = (questionId: string, index: number, value: string) => {
        const question = formData.customQuestions.find(q => q.id === questionId);
        if (question) {
            const options = [...(question.options || [])];
            options[index] = value;
            updateQuestion(questionId, { options });
        }
    };

    const handleNext = () => {
        // Validação Step 1
        if (currentStep === 1) {
            if (!formData.title.trim()) {
                toast.error('Preencha o título da vaga.');
                return;
            }
            if (!formData.category) {
                toast.error('Selecione a área / departamento da vaga.');
                return;
            }
        }

        // Validação Step 2
        if (currentStep === 2) {
            if (!formData.workModel) {
                toast.error('Selecione o modelo de trabalho.');
                return;
            }
            if ((formData.workModel === 'hybrid' || formData.workModel === 'onsite') && !formData.location.trim()) {
                toast.error('Informe a cidade / estado para vagas presenciais ou híbridas.');
                return;
            }
            if (!formData.contractType) {
                toast.error('Selecione o tipo de contrato.');
                return;
            }
            if (!formData.workRegime) {
                toast.error('Selecione o regime de trabalho.');
                return;
            }
        }

        // Validação Step 3
        if (currentStep === 3) {
            if (!formData.responsibilities.trim()) {
                toast.error('Preencha as responsabilidades da vaga.');
                return;
            }
            if (!formData.requirements.trim()) {
                toast.error('Preencha os requisitos da vaga.');
                return;
            }
        }

        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };





    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validações finais antes de enviar
        if (!formData.title.trim()) {
            toast.error('Por favor, preencha o título da vaga.');
            return;
        }
        if (!formData.contractType) {
            toast.error('Selecione o tipo de contrato.');
            return;
        }
        if ((formData.workModel === 'hybrid' || formData.workModel === 'onsite') && !formData.location.trim()) {
            toast.error('Informe a cidade / estado para vagas presenciais ou híbridas.');
            setCurrentStep(2);
            return;
        }
        if (!formData.responsibilities.trim()) {
            toast.error('Preencha as responsabilidades da vaga.');
            setCurrentStep(3);
            return;
        }
        if (!formData.requirements.trim()) {
            toast.error('Preencha os requisitos da vaga.');
            setCurrentStep(3);
            return;
        }

        setSaving(true);
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                toast.error('Usuário não autenticado');
                return;
            }

            // Buscar perfil para pegar organization_id
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (profileError) {
                console.error('Erro ao buscar perfil do usuário:', profileError);
                // Não trava o processo, mas avisa no log
            }

            const vagaData: Record<string, unknown> = {
                user_id: user.id,
                title: formData.title.trim(),
                description: formData.description.trim(),
                has_salary_range: formData.hasSalaryRange,
                salary_min: formData.hasSalaryRange && formData.salaryMin ? parseFloat(formData.salaryMin.replace(/[^\d,]/g, '').replace(',', '.')) : null,
                salary_max: formData.hasSalaryRange && formData.salaryMax ? parseFloat(formData.salaryMax.replace(/[^\d,]/g, '').replace(',', '.')) : null,
                contract_type: formData.contractType,
                has_location: formData.hasLocation,
                location: formData.hasLocation 
                    ? (formData.neighborhood?.trim() ? `${formData.location.trim()} - ${formData.neighborhood.trim()}` : formData.location.trim())
                    : null,
                work_model: formData.workModel,
                work_regime: formData.workRegime,
                is_pcd: formData.isPcd,
                responsibilities: formData.responsibilities.trim(),
                requirements: formData.requirements.trim(),
                differentials: formData.differentials.trim(),
                additional_info: formData.additionalInfo.trim(),
                category: formData.category || 'Outros',
                custom_questions: formData.customQuestions,
                is_third_party: formData.isThirdParty,
                company_name: formData.isThirdParty ? (formData.companyName?.trim() || null) : null,
                company_logo: formData.isThirdParty ? (formData.companyLogo || null) : null,
                show_company_name: formData.isThirdParty ? formData.showCompanyName : true,
                vaga_primary_color: formData.vagaPrimaryColor || null,
                vaga_gradient_end: formData.vagaGradientEnd || null,
                vaga_bg_color: formData.vagaBgColor || null,
                vaga_bg_image: formData.vagaBgImage || null,
                is_active: true,
            };

            // Apenas define organization_id se for criação de nova vaga
            if (!isEditMode) {
                vagaData.organization_id = profile?.organization_id;
            }

            let error;

            if (isEditMode) {
                // Atualizar vaga existente
                const { error: updateError } = await supabase
                    .from('vagas_white_label')
                    .update(vagaData)
                    .eq('id', id);
                error = updateError;
            } else {
                // Criar nova vaga
                const { error: insertError } = await supabase
                    .from('vagas_white_label')
                    .insert({
                        ...vagaData,
                        status: formData.initialStatus,
                        is_accepting_applications: formData.initialStatus === 'aberta' || formData.initialStatus === 'invisivel',
                        published_at: new Date().toISOString(),
                    });
                error = insertError;
            }

            if (error) throw error;

            // Log de auditoria
            if (isEditMode) {
                logActivity(user.id, `Editou a vaga: "${formData.title}"`).catch(console.error);
                toast.success('Vaga atualizada com sucesso!');
                navigate('/vagas');
            } else {
                logActivity(user.id, `Publicou nova vaga: "${formData.title}"`).catch(console.error);
                
                // Obter ID da vaga criada
                const { data: vagaData } = await supabase
                    .from('vagas_white_label')
                    .select('id, title')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (vagaData) {
                    setCreatedVagaId(vagaData.id);
                    setShowPipelineModal(true);
                } else {
                    toast.success('Vaga publicada com sucesso!');
                    navigate('/vagas');
                }
            }
        } catch (error) {
            console.error('Erro ao salvar vaga:', error);
            toast.error('Erro ao salvar a vaga. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    const handleCreatePipeline = async () => {
        if (!createdVagaId) return;
        setCreatingPipeline(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            const { data: vaga } = await supabase
                .from('vagas_white_label')
                .select('title, job_code')
                .eq('id', createdVagaId)
                .single();

            if (!vaga) throw new Error('Vaga não encontrada');

            const DEFAULT_COLUMNS = [
                { name: 'Triagem', color: '#6366f1', position: 0 },
                { name: 'Entrevista', color: '#0ea5e9', position: 1 },
                { name: 'Proposta', color: '#f59e0b', position: 2 },
                { name: 'Aprovado', color: '#22c55e', position: 3 },
                { name: 'Reprovado', color: '#ef4444', position: 4 },
            ];

            const { data: pipeline, error: pipelineError } = await supabase
                .from('pipelines')
                .insert({
                    user_id: user.id,
                    organization_id: profile?.organization_id,
                    name: vaga.job_code ? `${vaga.title} [${vaga.job_code}]` : vaga.title,
                    vaga_id: createdVagaId,
                    is_active: true,
                })
                .select('id')
                .single();

            if (pipelineError) throw pipelineError;

            const columnsToInsert = DEFAULT_COLUMNS.map(col => ({
                user_id: user.id,
                organization_id: profile?.organization_id,
                pipeline_id: pipeline.id,
                vaga_id: createdVagaId,
                name: col.name,
                color: col.color,
                position: col.position,
            }));

            const { error: columnsError } = await supabase
                .from('pipeline_columns')
                .insert(columnsToInsert);

            if (columnsError) throw columnsError;

            await supabase
                .from('vagas_white_label')
                .update({ pipeline_id: pipeline.id })
                .eq('id', createdVagaId);

            toast.success('Pipeline criado com sucesso!');
            setShowPipelineModal(false);
            navigate('/vagas');
        } catch (error) {
            console.error('Erro ao criar pipeline:', error);
            const errMsg = error instanceof Error ? error.message : (error as { message?: string }).message || 'Erro desconhecido';
            toast.error(`Erro ao criar pipeline: ${errMsg}`);
            setShowPipelineModal(false);
            navigate('/vagas');
        } finally {
            setCreatingPipeline(false);
        }
    };

    const handleSkipPipeline = () => {
        setShowPipelineModal(false);
        navigate('/vagas');
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '14px 16px',
        background: 'var(--bg-main)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        color: 'var(--text-main)',
        fontSize: '14px',
        outline: 'none',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
    };

    const sectionStyle = (isMobile: boolean): React.CSSProperties => ({
        background: 'var(--bg-card)',
        borderRadius: isMobile ? '20px' : '32px',
        border: '1px solid var(--border)',
        padding: isMobile ? '20px' : '32px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(10px)',
    });
    const navBtnStyle: React.CSSProperties = {
        padding: '14px 32px', background: 'transparent', border: '1px solid var(--border)',
        borderRadius: '10px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '15px',
        fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
    };
    const navBtnPrimaryStyle: React.CSSProperties = {
        padding: '14px 32px', background: 'var(--primary)', border: 'none',
        borderRadius: '10px', color: '#fff', cursor: 'pointer', fontSize: '15px',
        fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
    };
    const navContainerStyle = (isMobile: boolean): React.CSSProperties => ({
        display: 'flex',
        flexDirection: isMobile ? 'column-reverse' : 'row',
        justifyContent: 'space-between',
        gap: isMobile ? '12px' : '0',
        paddingTop: '8px',
    });

    const steps = [
        { number: 1, title: 'Informações Básicas' },
        { number: 2, title: 'Detalhes do Cargo' },
        { number: 3, title: 'Conteúdo da Vaga' },
        { number: 4, title: 'Jornada do Candidato' },
    ];

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Carregando vaga...</p>
            </div>
        );
    }

    return (
        <div>
            <style>{css}</style>

            {/* Header / Banner with Glassmorphism */}
            <div style={{
                background: bgTheme === 'spatial' 
                    ? 'linear-gradient(135deg, #070F2A 0%, #000000 100%)' 
                    : 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(12px)',
                border: bgTheme === 'spatial'
                    ? '1px solid rgba(44, 88, 253, 0.2)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: isMobile ? '20px' : '32px',
                padding: isMobile ? '32px 20px' : '80px 40px',
                marginTop: '0px',
                marginBottom: '40px',
                position: 'relative',
                zIndex: 10,
                boxShadow: bgTheme === 'spatial'
                    ? '0 15px 40px rgba(0, 0, 0, 0.5)'
                    : '0 10px 30px rgba(0, 0, 0, 0.15)',
                overflow: 'hidden'
            }}>
                {/* Theme-based backgrounds */}
                {!isMobile && bgTheme === 'spatial' && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: -1 }}>
                        <svg 
                            width="100%" 
                            height="100%" 
                            viewBox="0 0 400 200" 
                            preserveAspectRatio="none" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ opacity: 0.8 }}
                        >
                            <style>{`
                                .w1{stroke-dasharray:250 550;animation:t_form 6s linear infinite;}
                                .w2{stroke-dasharray:200 600;animation:t_form 8s linear infinite;}
                                @keyframes t_form{0%{stroke-dashoffset:800;}100%{stroke-dashoffset:0;}}
                            `}</style>
                            <path d="M0 20 C40 -20 80 180 130 100 C180 20 220 220 270 120 C320 20 360 220 400 180" stroke="rgba(44, 88, 253, 0.15)" strokeWidth="1.5" strokeLinecap="round"/>
                            <path d="M400 20 C360 -20 320 180 270 100 C220 20 180 220 130 120 C80 20 40 220 0 180" stroke="rgba(44, 88, 253, 0.15)" strokeWidth="1.5" strokeLinecap="round"/>
                            <path className="w1" d="M0 20 C40 -20 80 180 130 100 C180 20 220 220 270 120 C320 20 360 220 400 180" stroke="rgba(44, 88, 253, 0.7)" strokeWidth="2" strokeLinecap="round"/>
                            <path className="w2" d="M400 20 C360 -20 320 180 270 100 C220 20 180 220 130 120 C80 20 40 220 0 180" stroke="rgba(44, 88, 253, 0.5)" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <div className="card-spatial-glow" style={{ bottom: '-30px', right: '-30px', width: '150px', height: '150px' }} />
                    </div>
                )}

                {!isMobile && bgTheme === 'planets' && (
                    <div style={{ position: 'absolute', inset: 0, zIndex: -1, overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', width: '160px', height: '160px', borderRadius: '50%', background: '#6366f1', right: '-30px', top: '-30px', opacity: 0.25, filter: 'blur(40px)' }} />
                        {/* Animated Stars */}
                        {[...Array(40)].map((_, i) => (
                            <div 
                                key={i} 
                                className="star" 
                                style={{ 
                                    width: (i % 6 === 0 ? 2 : 1), 
                                    height: (i % 6 === 0 ? 2 : 1), 
                                    top: `${(i * 17) % 95}%`, 
                                    left: `${(i * 37) % 95}%`, 
                                    '--duration': `${1.5 + (i % 5) * 0.4}s`,
                                    animationDelay: `${i * 0.1}s`,
                                    opacity: 0.2 + (i % 5) * 0.15
                                } as React.CSSProperties}
                            />
                        ))}

                        {/* Floating Planet (Saturn) - Exactly like Dashboard KPI */}
                        <div
                            className="planet" 
                            style={{ 
                                width: 120, 
                                height: 120, 
                                background: 'black', 
                                backgroundImage: 'radial-gradient(circle at 35% 35%, #fef3c7 0%, #d97706 40%, #78350f 100%)', 
                                right: 60, 
                                bottom: -10,
                                animation: 'float 18s ease-in-out infinite',
                                zIndex: 2,
                                boxShadow: 'inset -20px -20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(217,119,6,0.15)'
                            } as React.CSSProperties}
                        >
                            <PlanetOverlay type="Saturn" />
                            <div className="planet-ring" style={{ 
                                width: 120 * 2.4, 
                                height: 120 * 0.5, 
                                background: 'radial-gradient(ellipse at center, transparent 38%, rgba(217,119,6,0.1) 39%, rgba(217,119,6,0.2) 45%, rgba(217,119,6,0.05) 55%, rgba(217,119,6,0.15) 65%, transparent 66%)', 
                                transform: 'translate(-50%, -50%) rotate(-15deg)', 
                                filter: 'blur(0.5px)',
                                boxShadow: '0 0 10px rgba(217,119,6,0.05)'
                            }} />
                        </div>
                    </div>
                )}

                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <h1 style={{ fontSize: isMobile ? '24px' : '36px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
                            {isEditMode ? 'Editar Vaga' : 'Criar Nova Vaga'}
                            {jobCode && <span style={{ marginLeft: 12, background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 10, fontSize: isMobile ? 14 : 18, verticalAlign: 'middle' }}>{jobCode}</span>}
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: isMobile ? '13px' : '15px', margin: 0, maxWidth: '600px' }}>
                            {isEditMode ? 'Atualize as informações da vaga' : 'Preencha as informações para publicar uma nova oportunidade'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Form Content */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '0 12px 60px' : '0 40px 80px', position: 'relative', zIndex: 1 }}>
                {/* Step Indicator */}
                <StepIndicator steps={steps} currentStep={currentStep} vertical={isMobile} />

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {/* Step 1: Basic Information */}
                    {currentStep === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
                            <div style={sectionStyle(isMobile)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, var(--primary), #7c3aed)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <FileText size={20} style={{ color: '#fff' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ color: 'var(--text-main)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                                            Informações Básicas
                                        </h2>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0' }}>
                                            Dados principais da vaga
                                        </p>
                                    </div>
                                </div>
                                
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', color: 'var(--text-main)', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                                        Título da Vaga *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => updateField('title', e.target.value)}
                                        placeholder="Ex: Desenvolvedor Frontend React Senior"
                                        style={inputStyle}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = 'var(--primary)';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'var(--border)';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', color: 'var(--text-main)', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                                        Área / Departamento *
                                    </label>
                                    <div className="hide-scrollbar" style={{ display: 'flex', flexWrap: 'nowrap', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                                        {[
                                            { label: 'Desenvolvimento', value: 'Desenvolvimento', color: '#6366f1' },
                                            { label: 'Infraestrutura', value: 'Infraestrutura', color: '#38bdf8' },
                                            { label: 'Design', value: 'Design', color: '#ec4899' },
                                            { label: 'Marketing', value: 'Marketing', color: '#f97316' },
                                            { label: 'RH', value: 'RH', color: '#22c55e' },
                                            { label: 'Administrativo/Financeiro', value: 'Administrativo/Financeiro', color: '#eab308' },
                                            { label: 'Comercial', value: 'Comercial', color: '#10b981' },
                                            { label: 'Atendimento', value: 'Atendimento', color: '#06b6d4' },
                                        ].map(sug => {
                                            const isSelected = formData.category === sug.value;
                                            const itemColor = sug.color;
                                            return (
                                                <button
                                                    key={sug.value}
                                                    type="button"
                                                    onClick={() => updateField('category', sug.value)}
                                                    style={{
                                                        whiteSpace: 'nowrap',
                                                        flexShrink: 0,
                                                        padding: '6px 12px',
                                                        borderRadius: '20px',
                                                        border: `1px solid ${isSelected ? itemColor : 'var(--border)'}`,
                                                        background: isSelected ? `${itemColor}26` : 'transparent',
                                                        color: isSelected ? itemColor : 'var(--text-muted)',
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isSelected) {
                                                            e.currentTarget.style.borderColor = itemColor;
                                                            e.currentTarget.style.color = itemColor;
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isSelected) {
                                                            e.currentTarget.style.borderColor = 'var(--border)';
                                                            e.currentTarget.style.color = 'var(--text-muted)';
                                                        }
                                                    }}
                                                >
                                                    {sug.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Status inicial da vaga - Apenas na Criação */}
                                {!isEditMode && (
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', color: 'var(--text-main)', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                                            Status inicial da vaga *
                                        </label>
                                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px' }}>
                                            {([
                                                { value: 'aberta', label: '🟢 Publicada (Visível no site)', desc: 'Aparece no painel / API e já recebe candidaturas', color: '#22c55e' },
                                                { value: 'invisivel', label: '🟣 Invisível (Apenas link)', desc: 'Não aparece no portal, mas pode ser acessada e receber candidaturas via link direto', color: '#6366f1' },
                                            ] as const).map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => updateField('initialStatus', opt.value)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '12px 16px',
                                                        borderRadius: '12px',
                                                        border: `1px solid ${formData.initialStatus === opt.value ? opt.color : 'var(--border)'}`,
                                                        background: formData.initialStatus === opt.value
                                                            ? `${opt.color}1a`
                                                            : 'transparent',
                                                        color: formData.initialStatus === opt.value
                                                            ? opt.color
                                                            : 'var(--text-muted)',
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        textAlign: 'left',
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 700, marginBottom: '2px' }}>{opt.label}</div>
                                                    <div style={{ fontSize: '11px', opacity: 0.75 }}>{opt.desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label style={{ display: 'block', color: 'var(--text-main)', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                                        Descrição da Vaga
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => updateField('description', e.target.value)}
                                        placeholder="Descreva a vaga, o objetivo e o contexto da posição..."
                                        rows={6}
                                        style={{ ...inputStyle, resize: 'vertical' }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = 'var(--primary)';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'var(--border)';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>

                                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />

                                <ToggleField
                                    label="Vaga para Cliente Externo?"
                                    description="Ative se estiver recrutando para outra empresa (Mileto, etc)"
                                    value={formData.isThirdParty}
                                    onChange={(value) => updateField('isThirdParty', value)}
                                    isMobile={isMobile}
                                />

                                {formData.isThirdParty && (
                                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px', animation: 'slideDown 0.3s ease-out' }}>
                                        <div>
                                            <label style={{ display: 'block', color: 'var(--text-main)', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                                                Nome da Empresa Cliente (Opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.companyName}
                                                onChange={(e) => updateField('companyName', e.target.value)}
                                                placeholder="Ex: Mileto, Google, Startup X..."
                                                style={inputStyle}
                                            />
                                        </div>

                                        <ToggleField
                                            label="Exibir nome da empresa no portal público?"
                                            description="Se desativado, a vaga aparecerá como confidencial"
                                            value={formData.showCompanyName}
                                            onChange={(value) => updateField('showCompanyName', value)}
                                            isMobile={isMobile}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Navigation Buttons */}
                            <div style={{ ...navContainerStyle(isMobile), alignItems: isMobile ? 'stretch' : 'center' }}>
                                <button
                                    type="button"
                                    onClick={() => navigate('/vagas')}
                                    style={{ ...navBtnStyle, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--bg-card)';
                                        e.currentTarget.style.color = 'var(--text-main)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = 'var(--text-muted)';
                                    }}
                                >
                                    <ArrowLeft size={16} />
                                    Voltar para Vagas
                                </button>

                                <button
                                    type="button"
                                    onClick={handleNext}
                                    style={{ ...navBtnPrimaryStyle, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#4f46e5'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
                                >
                                    Próximo
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Job Details */}
                    {currentStep === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
                            {/* Salary Range */}
                            <div style={sectionStyle(isMobile)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <DollarSign size={20} style={{ color: '#fff' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ color: 'var(--text-main)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                                            Remuneração
                                        </h2>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0' }}>
                                            Informações sobre salário
                                        </p>
                                    </div>
                                </div>
                                
                                <ToggleField
                                    label="Definir faixa salarial?"
                                    description="Ative para informar o intervalo de salário"
                                    value={formData.hasSalaryRange}
                                    onChange={(value) => updateField('hasSalaryRange', value)}
                                    isMobile={isMobile}
                                />

                                {/* Botão de pretensão salarial quando faixa não definida */}
                                {!formData.hasSalaryRange && (() => {
                                    const alreadyAdded = formData.customQuestions.some(q => q.id === '__salary_expectation__');
                                    return (
                                        <div style={{
                                            marginTop: '14px',
                                            padding: '14px 16px',
                                            background: alreadyAdded ? 'rgba(34, 197, 94, 0.07)' : 'rgba(99, 102, 241, 0.06)',
                                            border: `1px solid ${alreadyAdded ? 'rgba(34,197,94,0.25)' : 'rgba(99,102,241,0.2)'}`,
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '12px',
                                        }}>
                                            <div>
                                                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                                                    {alreadyAdded ? '✅ Pergunta de pretensão salarial adicionada' : '💡 Perguntar pretensão salarial ao candidato?'}
                                                </p>
                                                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                                                    {alreadyAdded
                                                        ? 'A pergunta foi adicionada à Jornada do Candidato.'
                                                        : 'Adiciona automaticamente um campo de resposta na jornada do candidato.'}
                                                </p>
                                            </div>
                                            {alreadyAdded ? (
                                                <button
                                                    type="button"
                                                    onClick={() => updateField('customQuestions', formData.customQuestions.filter(q => q.id !== '__salary_expectation__'))}
                                                    style={{
                                                        padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)',
                                                        background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                                                        fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    Remover
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => updateField('customQuestions', [
                                                        ...formData.customQuestions,
                                                        {
                                                            id: '__salary_expectation__',
                                                            label: 'Qual é a sua pretensão salarial?',
                                                            type: 'text' as const,
                                                            required: true,
                                                        }
                                                    ])}
                                                    style={{
                                                        padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.3)',
                                                        background: 'rgba(99,102,241,0.1)', color: 'var(--primary)',
                                                        fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    + Adicionar pergunta
                                                </button>
                                            )}
                                        </div>
                                    );
                                })()}

                                {formData.hasSalaryRange && (
                                    <p style={{ 
                                        color: 'var(--text-muted)', 
                                        fontSize: '12px', 
                                        marginTop: '12px',
                                        padding: '10px',
                                        background: 'rgba(255,255,255,0.02)',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <Info size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                        <span>Dica: Para salário fixo, preencha apenas o valor mínimo ou coloque valores iguais nos dois campos.</span>
                                    </p>
                                )}

                                {formData.hasSalaryRange && (
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginTop: '20px', animation: 'slideDown 0.3s ease-out' }}>
                                        <div>
                                            <label style={{ display: 'block', color: 'var(--text-main)', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                                                Salário Mínimo
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.salaryMin}
                                                onChange={(e) => updateField('salaryMin', e.target.value)}
                                                placeholder="R$ 5.000"
                                                style={inputStyle}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = 'var(--primary)';
                                                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = 'var(--border)';
                                                    e.target.style.boxShadow = 'none';
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: 'var(--text-main)', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                                                Salário Máximo
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.salaryMax}
                                                onChange={(e) => updateField('salaryMax', e.target.value)}
                                                placeholder="R$ 8.000"
                                                style={inputStyle}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = 'var(--primary)';
                                                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = 'var(--border)';
                                                    e.target.style.boxShadow = 'none';
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Contract Type */}
                            <div style={sectionStyle(isMobile)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Clock size={20} style={{ color: '#fff' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ color: 'var(--text-main)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                                            Tipo de Contrato *
                                        </h2>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0' }}>
                                            Selecione o modelo de contratação
                                        </p>
                                    </div>
                                </div>
                                
                                <RadioGroup
                                    label="Modelo de contratação"
                                    options={[
                                        { value: 'clt', label: 'CLT', description: 'Carteira assinada' },
                                        { value: 'pj', label: 'PJ', description: 'Pessoa jurídica' },
                                        { value: 'estagio', label: 'Estágio', description: 'Contrato de estágio' },
                                        { value: 'freelancer', label: 'Freelancer', description: 'Projeto temporário' },
                                    ]}
                                    value={formData.contractType}
                                    onChange={(value) => updateField('contractType', value)}
                                    columns={4}
                                    mobileColumns={isMobile ? 2 : undefined}
                                />
                            </div>

                            {/* Work Regime */}
                            <div style={sectionStyle(isMobile)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Clock size={20} style={{ color: '#fff' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ color: 'var(--text-main)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                                            Regime de Trabalho *
                                        </h2>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0' }}>
                                            Selecione a carga horária
                                        </p>
                                    </div>
                                </div>
                                
                                <RadioGroup
                                    label="Regime de trabalho"
                                    options={[
                                        { value: 'full-time', label: 'Tempo Integral', description: 'Full-time' },
                                        { value: 'part-time', label: 'Meio Período', description: 'Part-time' },
                                        { value: 'hourly', label: 'Por hora', description: 'Hourly / Horista' },
                                    ]}
                                    value={formData.workRegime}
                                    onChange={(value) => updateField('workRegime', value)}
                                    columns={3}
                                    mobileColumns={isMobile ? 1 : undefined}
                                />
                            </div>

                            {/* PcD - Pessoa com Deficiência */}
                            <div style={sectionStyle(isMobile)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #ec4899, #db2777)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                            <circle cx="10" cy="4" r="2.5" />
                                            <path d="M10 6.5 L10 11 L13 11" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
                                            <path d="M10 8 L13 10" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                            <circle cx="12" cy="14" r="5" stroke="white" strokeWidth="2" fill="none" />
                                            <path d="M8 11 L14 11" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                            <path d="M8 11 L8 8" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                            <path d="M14 11 L16 13 L15 14" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 style={{ color: 'var(--text-main)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                                            Vaga PcD
                                        </h2>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0' }}>
                                            Pessoa com Deficiência
                                        </p>
                                    </div>
                                </div>

                                <RadioGroup
                                    label="Configuração de PcD"
                                    options={[
                                        { value: 'no', label: 'Padrão', description: 'Vaga regular (sem foco PcD)' },
                                        { value: 'exclusive', label: 'Exclusiva PcD', description: 'Destinada apenas a PcD' },
                                        { value: 'inclusive', label: 'Inclusiva', description: 'Aberta a todos (Padrão + PcD)' },
                                    ]}
                                    value={formData.isPcd}
                                    onChange={(value) => updateField('isPcd', value)}
                                    columns={3}
                                    mobileColumns={isMobile ? 1 : undefined}
                                />
                            </div>

                            {/* Location */}
                            <div style={sectionStyle(isMobile)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <MapPin size={20} style={{ color: '#fff' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ color: 'var(--text-main)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                                            Modelo de trabalho *
                                        </h2>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0' }}>
                                            Selecione como será o regime de presença
                                        </p>
                                    </div>
                                </div>

                                <RadioGroup
                                    label="Modelo de trabalho"
                                    options={[
                                        { value: 'remote', label: 'Remoto', icon: <MapPin size={18} />, description: '100% remoto' },
                                        { value: 'hybrid', label: 'Híbrido', icon: <Building2 size={18} />, description: 'Semi-presencial' },
                                        { value: 'onsite', label: 'Presencial', icon: <Building2 size={18} />, description: 'No escritório' },
                                    ]}
                                    value={formData.workModel}
                                    onChange={(value) => {
                                        updateField('workModel', value);
                                        // Se mudar para remoto, limpa localização
                                        if (value === 'remote') {
                                            updateField('location', '');
                                            updateField('hasLocation', false);
                                        } else {
                                            updateField('hasLocation', true);
                                        }
                                    }}
                                    columns={3}
                                    mobileColumns={isMobile ? 1 : undefined}
                                />

                                {/* Campo de cidade — só aparece para Híbrido ou Presencial */}
                                {(formData.workModel === 'hybrid' || formData.workModel === 'onsite') && (
                                    <>
                                        <CityAutocomplete
                                            value={formData.location}
                                            onChange={(val) => updateField('location', val)}
                                            inputStyle={inputStyle}
                                        />

                                        <div style={{ marginTop: '20px' }}>
                                            <label style={{ display: 'block', color: 'var(--text-main)', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                                                Bairro (Opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.neighborhood}
                                                onChange={(e) => updateField('neighborhood', e.target.value)}
                                                placeholder="Ex: Pinheiros"
                                                style={inputStyle}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = 'var(--primary)';
                                                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = 'var(--border)';
                                                    e.target.style.boxShadow = 'none';
                                                }}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Navigation Buttons */}
                            <div style={{ ...navContainerStyle(isMobile) }}>
                                <button
                                    type="button"
                                    onClick={handlePrevious}
                                    style={{ ...navBtnStyle, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--bg-card)';
                                        e.currentTarget.style.color = 'var(--text-main)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = 'var(--text-muted)';
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Anterior
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    style={{ ...navBtnPrimaryStyle, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#4f46e5'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
                                >
                                    Próximo
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Content */}
                    {currentStep === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
                            {/* Responsibilities */}
                            <div style={sectionStyle(isMobile)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Target size={20} style={{ color: '#fff' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ color: 'var(--text-main)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                                            Responsabilidades *
                                        </h2>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0' }}>
                                            Liste as principais responsabilidades do cargo
                                        </p>
                                    </div>
                                </div>
                                <textarea
                                    value={formData.responsibilities}
                                    onChange={(e) => updateField('responsibilities', e.target.value)}
                                    placeholder={`Ex:\n• Desenvolver aplicações web com React\n• Participar de code reviews\n• Documentar funcionalidades\n• Mentorar desenvolvedores júnior`}
                                    rows={6}
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--primary)';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'var(--border)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>

                            {/* Requirements */}
                            <div style={sectionStyle(isMobile)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Award size={20} style={{ color: '#fff' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ color: 'var(--text-main)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                                            Requisitos *
                                        </h2>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0' }}>
                                            Liste os requisitos obrigatórios
                                        </p>
                                    </div>
                                </div>
                                <textarea
                                    value={formData.requirements}
                                    onChange={(e) => updateField('requirements', e.target.value)}
                                    placeholder={`Ex:\n• Experiência com React e TypeScript\n• Conhecimento em APIs REST\n• Git e controle de versão\n• Ensino superior em Tecnologia`}
                                    rows={6}
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--primary)';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'var(--border)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>

                            {/* Differentials */}
                            <div style={sectionStyle(isMobile)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Star size={20} style={{ color: '#fff' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ color: 'var(--text-main)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                                            Diferenciais
                                        </h2>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0' }}>
                                            Liste diferenciais que serão considerados um plus
                                        </p>
                                    </div>
                                </div>
                                <textarea
                                    value={formData.differentials}
                                    onChange={(e) => updateField('differentials', e.target.value)}
                                    placeholder={`Ex:\n• Experiência com Next.js\n• Conhecimento em AWS\n• Inglês fluente\n• Pós-graduação`}
                                    rows={5}
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--primary)';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'var(--border)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>

                            {/* Additional Info */}
                            <div style={sectionStyle(isMobile)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #ec4899, #db2777)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Info size={20} style={{ color: '#fff' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ color: 'var(--text-main)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                                            Informações Adicionais
                                        </h2>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0' }}>
                                            Informações complementares sobre benefícios, cultura, etc.
                                        </p>
                                    </div>
                                </div>
                                <textarea
                                    value={formData.additionalInfo}
                                    onChange={(e) => updateField('additionalInfo', e.target.value)}
                                    placeholder={`Ex:\n• Benefícios: VA/VR, plano de saúde, gympass\n• Horário flexível\n• Trabalho remoto híbrido\n• Plano de carreira e desenvolvimento`}
                                    rows={5}
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--primary)';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'var(--border)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>

                            {/* Navigation Buttons */}
                            <div style={{ ...navContainerStyle(isMobile) }}>
                                <button
                                    type="button"
                                    onClick={handlePrevious}
                                    style={{ ...navBtnStyle, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--bg-card)';
                                        e.currentTarget.style.color = 'var(--text-main)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = 'var(--text-muted)';
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Anterior
                                </button>
                                 <button
                                    type="button"
                                    onClick={handleNext}
                                    style={{ ...navBtnPrimaryStyle, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#4f46e5'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
                                >
                                    Próximo
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Candidate Journey */}
                    {currentStep === 4 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
                            <div style={sectionStyle(isMobile)}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '10px',
                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <Settings size={20} style={{ color: '#fff' }} />
                                        </div>
                                        <div>
                                            <h2 style={{ color: 'var(--text-main)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                                                Jornada do Candidato
                                            </h2>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0' }}>
                                                Adicione perguntas personalizadas para filtrar candidatos
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <button
                                        type="button"
                                        onClick={addQuestion}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 16px',
                                            background: 'rgba(16, 185, 129, 0.1)',
                                            border: '1px solid rgba(16, 185, 129, 0.2)',
                                            borderRadius: '10px',
                                            color: '#10b981',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                                    >
                                        <Plus size={18} />
                                        Adicionar Pergunta
                                    </button>
                                </div>

                                {/* Questions List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {formData.customQuestions.length === 0 ? (
                                        <div style={{
                                            padding: '40px',
                                            textAlign: 'center',
                                            background: 'rgba(255,255,255,0.02)',
                                            borderRadius: '12px',
                                            border: '1px dashed var(--border)'
                                        }}>
                                            <Info size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.5 }} />
                                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                                                Nenhuma pergunta personalizada adicionada.
                                                <br />Apenas os campos padrão (Nome, E-mail, Currículo...) serão exibidos.
                                            </p>
                                        </div>
                                    ) : (
                                        formData.customQuestions.map((q, index) => (
                                            <div key={q.id} style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border)',
                                                padding: '20px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '16px',
                                                position: 'relative'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '6px',
                                                        background: 'var(--primary)',
                                                        color: '#fff',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        {index + 1}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={q.label}
                                                        onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                                                        placeholder="Ex: Qual sua experiência com React?"
                                                        style={{ ...inputStyle, flex: 1 }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeQuestion(q.id)}
                                                        style={{
                                                            padding: '8px',
                                                            color: '#ef4444',
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>

                                                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                                    {/* Type Selector */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ display: 'flex', background: 'var(--bg-main)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                            {[
                                                                { value: 'text', label: 'Texto', icon: <Type size={14} /> },
                                                                { value: 'paragraph', label: 'Parágrafo', icon: <List size={14} /> },
                                                                { value: 'choice', label: 'Seleção', icon: <CheckCircle2 size={14} /> }
                                                            ].map(opt => (
                                                                <button
                                                                    key={opt.value}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updates: Partial<VagaFormData['customQuestions'][0]> = { type: opt.value as 'text' | 'paragraph' | 'choice' };
                                                                        if (opt.value === 'choice' && (!q.options || q.options.length === 0)) {
                                                                            updates.options = ['', ''];
                                                                        }
                                                                        updateQuestion(q.id, updates);
                                                                    }}
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        padding: '6px 12px',
                                                                        fontSize: '12px',
                                                                        fontWeight: 600,
                                                                        borderRadius: '6px',
                                                                        border: 'none',
                                                                        cursor: 'pointer',
                                                                        background: q.type === opt.value ? 'var(--primary)' : 'transparent',
                                                                        color: q.type === opt.value ? '#fff' : 'var(--text-muted)',
                                                                        transition: 'all 0.2s'
                                                                    }}
                                                                >
                                                                    {opt.icon}
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Required Toggle */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <input
                                                            type="checkbox"
                                                            id={`req-${q.id}`}
                                                            checked={q.required}
                                                            onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                        <label htmlFor={`req-${q.id}`} style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                                            Obrigatória
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Conditional Logic Section */}
                                                {index > 0 && q.id !== '__salary_expectation__' && formData.customQuestions.slice(0, index).some(prevQ => prevQ.type === 'choice' && prevQ.options && prevQ.options.length > 0) && (
                                                    <div style={{ marginTop: '4px', padding: '16px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: q.logic ? '12px' : '0' }}>
                                                            <Zap size={14} style={{ color: 'var(--primary)' }} />
                                                            <span style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: 600 }}>Exibição Condicional</span>
                                                            {!q.logic ? (
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => updateQuestion(q.id, { logic: { parentId: '', parentValue: '' } })}
                                                                    style={{ color: 'var(--primary)', background: 'transparent', border: 'none', borderBottom: '1px dashed var(--primary)', fontSize: '12px', cursor: 'pointer', marginLeft: 'auto', padding: 0 }}
                                                                >
                                                                    Configurar Lógica
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newQuestions = formData.customQuestions.map(item => {
                                                                            if (item.id === q.id) {
                                                                                const { logic, ...rest } = item;
                                                                                void logic;
                                                                                return rest;
                                                                            }
                                                                            return item;
                                                                        });
                                                                        updateField('customQuestions', newQuestions);
                                                                    }}
                                                                    style={{ color: '#ef4444', background: 'transparent', border: 'none', borderBottom: '1px dashed #ef4444', fontSize: '12px', cursor: 'pointer', marginLeft: 'auto', padding: 0 }}
                                                                >
                                                                    Remover Lógica
                                                                </button>
                                                            )}
                                                        </div>
                                                        
                                                        {q.logic && (
                                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Mostrar esta pergunta se</span>
                                                                <select 
                                                                    value={q.logic.parentId}
                                                                    onChange={(e) => updateQuestion(q.id, { logic: { ...q.logic!, parentId: e.target.value, parentValue: '' } })}
                                                                    style={{ ...inputStyle, padding: '6px 10px', fontSize: '13px', width: 'auto', background: 'var(--bg-main)' }}
                                                                >
                                                                    <option value="">Selecionar Pergunta...</option>
                                                                    {formData.customQuestions.slice(0, index).filter(pq => pq.type === 'choice').map(pq => (
                                                                        <option key={pq.id} value={pq.id}>{pq.label || `Pergunta ${formData.customQuestions.indexOf(pq) + 1}`}</option>
                                                                    ))}
                                                                </select>
                                                                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>for igual a</span>
                                                                <select 
                                                                    value={q.logic.parentValue}
                                                                    onChange={(e) => updateQuestion(q.id, { logic: { ...q.logic!, parentValue: e.target.value } })}
                                                                    style={{ ...inputStyle, padding: '6px 10px', fontSize: '13px', width: 'auto', background: 'var(--bg-main)' }}
                                                                    disabled={!q.logic.parentId}
                                                                >
                                                                    <option value="">Selecionar Valor...</option>
                                                                    {formData.customQuestions.find(pq => pq.id === q.logic?.parentId)?.options?.map(opt => (
                                                                        <option key={opt} value={opt}>{opt}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                 {/* Options for Choice type */}
                                                {q.type === 'choice' && (
                                                    <div style={{ marginTop: '8px', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                                            <label style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: 700 }}>
                                                                Opções de Resposta
                                                            </label>
                                                            <button
                                                                type="button"
                                                                onClick={() => addOption(q.id)}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    padding: '4px 10px',
                                                                    background: 'rgba(99, 102, 241, 0.1)',
                                                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                                                    borderRadius: '6px',
                                                                    color: 'var(--primary)',
                                                                    fontSize: '12px',
                                                                    fontWeight: 600,
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                <Plus size={14} />
                                                                Adicionar Opção
                                                            </button>
                                                        </div>

                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            {q.options?.map((opt, idx) => (
                                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <div style={{ color: 'var(--text-muted)', cursor: 'grab' }}>
                                                                        <GripVertical size={14} />
                                                                    </div>
                                                                    <input
                                                                        type="text"
                                                                        value={opt}
                                                                        onChange={(e) => updateOption(q.id, idx, e.target.value)}
                                                                        placeholder={`Opção ${idx + 1}`}
                                                                        style={{ ...inputStyle, padding: '10px 12px', paddingLeft: '12px' }}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeOption(q.id, idx)}
                                                                        style={{
                                                                            padding: '8px',
                                                                            color: '#ef4444',
                                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                                            border: 'none',
                                                                            borderRadius: '8px',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Complementary Text Config */}
                                                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: q.hasComplementary ? '12px' : '0' }}>
                                                                <input 
                                                                    type="checkbox"
                                                                    id={`comp-${q.id}`}
                                                                    checked={q.hasComplementary}
                                                                    onChange={(e) => updateQuestion(q.id, { hasComplementary: e.target.checked })}
                                                                    style={{ cursor: 'pointer' }}
                                                                />
                                                                <label htmlFor={`comp-${q.id}`} style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                                                    Habilitar campo de texto complementar? (Opcional)
                                                                </label>
                                                            </div>
                                                            
                                                            {q.hasComplementary && (
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', animation: 'dashFadeUp 0.3s ease-out' }}>
                                                                    <div>
                                                                        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>Ativar detalhes quando selecionar:</label>
                                                                        <select 
                                                                            value={q.complementaryTrigger}
                                                                            onChange={(e) => updateQuestion(q.id, { complementaryTrigger: e.target.value })}
                                                                            style={{ ...inputStyle, padding: '8px 12px', fontSize: '13px', background: 'var(--bg-main)' }}
                                                                        >
                                                                            <option value="">Sempre exibir</option>
                                                                            {q.options?.map(opt => (
                                                                                <option key={opt} value={opt}>{opt}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>Legenda do campo extra</label>
                                                                        <input 
                                                                            type="text"
                                                                            value={q.complementaryLabel || ''}
                                                                            onChange={(e) => updateQuestion(q.id, { complementaryLabel: e.target.value })}
                                                                            placeholder="Ex: Se sim, descreva:"
                                                                            style={{ ...inputStyle, padding: '8px 12px', fontSize: '13px', background: 'var(--bg-main)' }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>


                            {/* Navigation Buttons for Step 4 */}
                            <div style={{ ...navContainerStyle(isMobile) }}>
                                <button
                                    type="button"
                                    onClick={handlePrevious}
                                    style={{ ...navBtnStyle, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--bg-card)';
                                        e.currentTarget.style.color = 'var(--text-main)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = 'var(--text-muted)';
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Anterior
                                </button>
                                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/vagas')}
                                        style={{ ...navBtnStyle, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'var(--bg-card)';
                                            e.currentTarget.style.color = 'var(--text-main)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'var(--text-muted)';
                                        }}
                                    >
                                        <X size={16} />
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="btn-publish"
                                        style={{
                                            padding: '14px 32px',
                                            border: 'none',
                                            borderRadius: '10px',
                                            color: '#fff',
                                            cursor: saving ? 'not-allowed' : 'pointer',
                                            fontSize: '15px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            opacity: saving ? 0.6 : 1,
                                            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
                                            width: isMobile ? '100%' : 'auto',
                                        }}
                                    >
                                        <Save size={16} />
                                        {saving ? 'Salvando...' : (isEditMode ? 'Atualizar Vaga' : 'Publicar Vaga')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideDown {
                    from { opacity: 0; max-height: 0; }
                    to { opacity: 1; max-height: 1000px; }
                }
                @keyframes shine {
                    0% { transform: translateX(-100%) skewX(-15deg); }
                    100% { transform: translateX(200%) skewX(-15deg); }
                }
                @keyframes gradientShift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .btn-publish {
                    position: relative;
                    overflow: hidden;
                    background: linear-gradient(135deg, var(--primary), #7c3aed, var(--primary));
                    background-size: 200% 200%;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                @media (min-width: 769px) {
                    .btn-publish {
                        animation: gradientShift 3.5s ease infinite;
                    }
                    .btn-publish::after {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 60%;
                        height: 100%;
                        background: linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent);
                        animation: shine 2.5s infinite;
                    }
                }
                .btn-publish:hover {
                    transform: translateY(-5px) scale(1.04);
                    box-shadow: 0 15px 35px rgba(99, 102, 241, 0.5), 0 0 20px rgba(124, 58, 237, 0.4);
                    border-color: rgba(255, 255, 255, 0.3);
                }
                .btn-publish:active {
                    transform: translateY(-1px) scale(0.96);
                }
            `}</style>

            {/* Pipeline Creation Modal */}
            {showPipelineModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '20px',
                        border: '1px solid var(--border)',
                        padding: isMobile ? '24px' : '40px',
                        maxWidth: '520px',
                        width: isMobile ? 'calc(100% - 32px)' : '90%',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        {/* Decorative background element */}
                        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '120%', height: '40%', background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.08) 0%, transparent 100%)', zIndex: 0 }} />
                        
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '24px',
                                background: 'rgba(99, 102, 241, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 24px',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                boxShadow: '0 12px 32px rgba(99, 102, 241, 0.2)'
                            }}>
                                <Kanban size={40} style={{ color: 'var(--primary)' }} />
                            </div>

                            <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px', letterSpacing: '-0.02em' }}>
                                Vaga Publicada! 🎉
                            </h2>
                            
                            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
                                Sua vaga já está ativa. Deseja criar um Pipeline Kanban para gerenciar os candidatos desta vaga de forma visual?
                            </p>

                            {/* info box */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid var(--border)',
                                borderRadius: '16px',
                                padding: '20px',
                                marginBottom: '32px',
                                textAlign: 'left'
                            }}>
                                <p style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: 700, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Etapas sugeridas:
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {[
                                        { name: 'Triagem', color: '#6366f1' },
                                        { name: 'Entrevista', color: '#0ea5e9' },
                                        { name: 'Proposta', color: '#f59e0b' },
                                        { name: 'Aprovado', color: '#22c55e' },
                                        { name: 'Reprovado', color: '#ef4444' }
                                    ].map((col, idx) => (
                                        <span key={idx} style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '6px 12px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            borderRadius: '8px',
                                            color: 'var(--text-main)',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            border: '1px solid rgba(255, 255, 255, 0.05)'
                                        }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
                                            {col.name}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button
                                    onClick={handleCreatePipeline}
                                    disabled={creatingPipeline}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        background: 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: '#fff',
                                        cursor: creatingPipeline ? 'not-allowed' : 'pointer',
                                        fontSize: '16px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)'
                                    }}
                                >
                                    {creatingPipeline ? 'Criando...' : 'Sim, Criar Pipeline'}
                                </button>
                                
                                <button
                                    onClick={handleSkipPipeline}
                                    disabled={creatingPipeline}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        background: 'transparent',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '15px',
                                        fontWeight: 600,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Não, criar manualmente depois
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
