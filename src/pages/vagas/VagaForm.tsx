import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import toast from 'react-hot-toast';
import { 
    ArrowLeft, Save, X, Briefcase, FileText, Target, Award, Star, Info, 
    DollarSign, MapPin, Building2, Clock, Kanban, Plus, Trash2, Settings, 
    List, Type, CheckCircle2, GripVertical, Zap, Upload
} from 'lucide-react';
import { StepIndicator } from './components/StepIndicator';
import { logActivity } from '../../core/services/logger';
import { ToggleField } from './components/ToggleField';
import { RadioGroup } from './components/RadioGroup';
import { useUser } from '../../core/contexts/UserContext';

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
@keyframes dashFadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
@keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.1); } }
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
.star { position: absolute; background: white; border-radius: 50%; pointer-events: none; animation: twinkle var(--duration) ease-in-out infinite; opacity: 0.6; }
.planet { position: absolute; border-radius: 50%; pointer-events: none; z-index: 0; filter: blur(1px); box-shadow: inset -10px -10px 20px rgba(0,0,0,0.3), 0 0 20px rgba(255,255,255,0.1); }
`;

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
    workModel: string;
    workRegime: string;
    isPcd: string;

    // Step 3: Content
    responsibilities: string;
    requirements: string;
    differentials: string;
    additionalInfo: string;
    category: string;
    
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
    workModel: '',
    workRegime: '',
    isPcd: 'no',
    responsibilities: '',
    requirements: '',
    differentials: '',
    additionalInfo: '',
    category: '',
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
    const { profile } = useUser();
    
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<VagaFormData>(initialFormData);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(isEditMode);
    const [showPipelineModal, setShowPipelineModal] = useState(false);
    const [createdVagaId, setCreatedVagaId] = useState<string | null>(null);
    const [creatingPipeline, setCreatingPipeline] = useState(false);

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

                setFormData({
                    title: data.title || '',
                    description: data.description || '',
                    hasSalaryRange: data.has_salary_range || false,
                    salaryMin: data.salary_min ? data.salary_min.toString() : '',
                    salaryMax: data.salary_max ? data.salary_max.toString() : '',
                    contractType: data.contract_type || '',
                    hasLocation: data.has_location || false,
                    location: data.location || '',
                    workModel: data.work_model || '',
                    workRegime: data.work_regime || '',
                    isPcd: data.is_pcd || 'no',
                    responsibilities: data.responsibilities || '',
                    requirements: data.requirements || '',
                    differentials: data.differentials || '',
                    additionalInfo: data.additional_info || '',
                    category: data.category || '',
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
        }

        // Validação Step 2
        if (currentStep === 2) {
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

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !profile?.organization_id) return;

        const fileExt = file.name.split('.').pop();
        const fileName = `${profile.organization_id}/clients/logo_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        
        const toastId = toast.loading('Enviando logo do cliente...');

        try {
            const { error: uploadError } = await supabase.storage
                .from('organizations')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('organizations')
                .getPublicUrl(fileName);

            updateField('companyLogo', publicUrl);
            toast.success('Logo do cliente enviada!', { id: toastId });
        } catch (error: any) {
            console.error('Erro no upload:', error);
            toast.error('Erro ao enviar logo.', { id: toastId });
        }
    };

    const handleBgImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !profile?.organization_id) return;

        const fileExt = file.name.split('.').pop();
        const fileName = `${profile.organization_id}/vagas/bg_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const toastId = toast.loading('Enviando imagem de fundo...');

        try {
            const { error: uploadError } = await supabase.storage
                .from('organizations')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('organizations')
                .getPublicUrl(fileName);

            updateField('vagaBgImage', publicUrl);
            toast.success('Imagem de fundo enviada!', { id: toastId });
        } catch (error: any) {
            console.error('Erro no upload:', error);
            toast.error('Erro ao enviar imagem.', { id: toastId });
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
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            const vagaData: any = {
                user_id: user.id,
                title: formData.title.trim(),
                description: formData.description.trim(),
                has_salary_range: formData.hasSalaryRange,
                salary_min: formData.hasSalaryRange && formData.salaryMin ? parseFloat(formData.salaryMin.replace(/[^\d,]/g, '').replace(',', '.')) : null,
                salary_max: formData.hasSalaryRange && formData.salaryMax ? parseFloat(formData.salaryMax.replace(/[^\d,]/g, '').replace(',', '.')) : null,
                contract_type: formData.contractType,
                has_location: formData.hasLocation,
                location: formData.hasLocation ? formData.location.trim() : null,
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
                        status: 'aberta',
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
                .select('title')
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
                    name: vaga.title,
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

            toast.success('Pipeline criado com sucesso!');
            setShowPipelineModal(false);
            navigate('/vagas');
        } catch (error) {
            console.error('Erro ao criar pipeline:', error);
            const errMsg = error instanceof Error ? error.message : (error as any)?.message || 'Erro desconhecido';
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

    const sectionStyle: React.CSSProperties = {
        background: 'var(--bg-card)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        padding: '28px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    };

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
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '40px 40px 50px',
                marginBottom: '40px',
                position: 'relative',
                zIndex: 10
            }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                        <div style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '20px',
                            background: 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 12px 40px rgba(99, 102, 241, 0.25)',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}>
                            <Briefcase size={36} style={{ color: '#fff' }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
                                {isEditMode ? 'Editar Vaga' : 'Criar Nova Vaga'}
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '16px', margin: '8px 0 0', maxWidth: '600px' }}>
                                {isEditMode ? 'Atualize as informações da vaga' : 'Preencha as informações para publicar uma nova oportunidade'}
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Compact Back Button at Bottom Left of Banner */}
                <button
                    onClick={() => navigate('/vagas')}
                    style={{
                        position: 'absolute',
                        bottom: '24px',
                        left: '40px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 18px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        zIndex: 20
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                >
                    <ArrowLeft size={16} /> Voltar para Vagas
                </button>
            </div>

            {/* Form Content */}
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 32px 32px', position: 'relative', zIndex: 1 }}>
                {/* Step Indicator */}
                <StepIndicator steps={steps} currentStep={currentStep} />

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {/* Step 1: Basic Information */}
                    {currentStep === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
                            <div style={sectionStyle}>
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
                                    <label style={{ display: 'block', color: 'var(--text-main)', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                                        Área / Departamento
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.category}
                                        onChange={(e) => updateField('category', e.target.value)}
                                        placeholder="Ex: Desenvolvimento, Design, Marketing, Vendas..."
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
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                                        {['Desenvolvimento', 'Design', 'Marketing', 'Vendas', 'RH', 'Financeiro', 'Produto'].map(sug => (
                                            <button
                                                key={sug}
                                                type="button"
                                                onClick={() => updateField('category', sug)}
                                                style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    border: '1px solid var(--border)',
                                                    background: formData.category === sug ? 'var(--primary-bg)' : 'transparent',
                                                    color: formData.category === sug ? 'var(--primary)' : 'var(--text-muted)',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {sug}
                                            </button>
                                        ))}
                                    </div>
                                </div>

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
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Navigation Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    style={{
                                        padding: '14px 32px',
                                        background: 'var(--primary)',
                                        border: 'none',
                                        borderRadius: '10px',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '15px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s'
                                    }}
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
                            <div style={sectionStyle}>
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
                                />

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
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px', animation: 'slideDown 0.3s ease-out' }}>
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
                            <div style={sectionStyle}>
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
                                />
                            </div>

                            {/* Work Regime */}
                            <div style={sectionStyle}>
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
                                />
                            </div>

                            {/* PcD - Pessoa com Deficiência */}
                            <div style={sectionStyle}>
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
                                />
                            </div>

                            {/* Location */}
                            <div style={sectionStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <MapPin size={20} style={{ color: '#fff' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ color: 'var(--text-main)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                                            Localidade
                                        </h2>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '2px 0 0' }}>
                                            Informações sobre o local de trabalho
                                        </p>
                                    </div>
                                </div>
                                
                                <ToggleField
                                    label="Definir localidade?"
                                    description="Ative para informar cidade e modelo de trabalho"
                                    value={formData.hasLocation}
                                    onChange={(value) => updateField('hasLocation', value)}
                                />

                                {formData.hasLocation && (
                                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px', animation: 'slideDown 0.3s ease-out' }}>
                                        <div>
                                            <label style={{ display: 'block', color: 'var(--text-main)', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                                                Cidade / Estado
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.location}
                                                onChange={(e) => updateField('location', e.target.value)}
                                                placeholder="Ex: São Paulo, SP"
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

                                        <RadioGroup
                                            label="Modelo de trabalho"
                                            options={[
                                                { value: 'remote', label: 'Remoto', icon: <MapPin size={18} />, description: '100% remoto' },
                                                { value: 'hybrid', label: 'Híbrido', icon: <Building2 size={18} />, description: 'Semi-presencial' },
                                                { value: 'onsite', label: 'Presencial', icon: <Building2 size={18} />, description: 'No escritório' },
                                            ]}
                                            value={formData.workModel}
                                            onChange={(value) => updateField('workModel', value)}
                                            columns={3}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Navigation Buttons */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={handlePrevious}
                                    style={{
                                        padding: '14px 24px',
                                        background: 'transparent',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '15px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s'
                                    }}
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
                                    style={{
                                        padding: '14px 32px',
                                        background: 'var(--primary)',
                                        border: 'none',
                                        borderRadius: '10px',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '15px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s'
                                    }}
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
                            <div style={sectionStyle}>
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
                            <div style={sectionStyle}>
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
                            <div style={sectionStyle}>
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
                            <div style={sectionStyle}>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={handlePrevious}
                                    style={{
                                        padding: '14px 24px',
                                        background: 'transparent',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '15px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s'
                                    }}
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
                                    style={{
                                        padding: '14px 32px',
                                        background: 'var(--primary)',
                                        border: 'none',
                                        borderRadius: '10px',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '15px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s'
                                    }}
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
                            <div style={sectionStyle}>
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
                                                                        const updates: any = { type: opt.value };
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
                                                {index > 0 && formData.customQuestions.slice(0, index).some(prevQ => prevQ.type === 'choice' && prevQ.options && prevQ.options.length > 0) && (
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={handlePrevious}
                                    style={{
                                        padding: '14px 24px',
                                        background: 'transparent',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '15px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s'
                                    }}
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
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/vagas')}
                                        style={{
                                            padding: '14px 24px',
                                            background: 'transparent',
                                            border: '1px solid var(--border)',
                                            borderRadius: '10px',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer',
                                            fontSize: '15px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s'
                                        }}
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
                                        style={{
                                            padding: '14px 32px',
                                            background: saving ? 'var(--text-muted)' : 'linear-gradient(135deg, var(--primary), #7c3aed)',
                                            border: 'none',
                                            borderRadius: '10px',
                                            color: '#fff',
                                            cursor: saving ? 'not-allowed' : 'pointer',
                                            fontSize: '15px',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            transition: 'all 0.2s',
                                            opacity: saving ? 0.6 : 1,
                                            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!saving) e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!saving) e.currentTarget.style.transform = 'translateY(0)';
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
                        background: '#1a1c2d',
                        borderRadius: '20px',
                        border: '1px solid var(--border)',
                        padding: '40px',
                        maxWidth: '520px',
                        width: '90%',
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
