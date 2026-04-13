import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, X, Briefcase, FileText, Target, Award, Star, Info, DollarSign, MapPin, Building2, Clock } from 'lucide-react';
import { StepIndicator } from './components/StepIndicator';
import { ToggleField } from './components/ToggleField';
import { RadioGroup } from './components/RadioGroup';

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
    
    // Step 3: Content
    responsibilities: string;
    requirements: string;
    differentials: string;
    additionalInfo: string;
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
    responsibilities: '',
    requirements: '',
    differentials: '',
    additionalInfo: '',
};

export const VagaForm = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;
    
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<VagaFormData>(initialFormData);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(isEditMode);

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
                    responsibilities: data.responsibilities || '',
                    requirements: data.requirements || '',
                    differentials: data.differentials || '',
                    additionalInfo: data.additional_info || '',
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

        if (currentStep < 3) {
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

            const vagaData = {
                user_id: user.id,
                title: formData.title.trim(),
                description: formData.description.trim() || null,
                has_salary_range: formData.hasSalaryRange,
                salary_min: formData.hasSalaryRange && formData.salaryMin ? parseFloat(formData.salaryMin.replace(/[^\d,]/g, '').replace(',', '.')) : null,
                salary_max: formData.hasSalaryRange && formData.salaryMax ? parseFloat(formData.salaryMax.replace(/[^\d,]/g, '').replace(',', '.')) : null,
                contract_type: formData.contractType || null,
                has_location: formData.hasLocation,
                location: formData.hasLocation && formData.location ? formData.location.trim() : null,
                work_model: formData.hasLocation && formData.workModel ? formData.workModel : null,
                responsibilities: formData.responsibilities.trim() || null,
                requirements: formData.requirements.trim() || null,
                differentials: formData.differentials.trim() || null,
                additional_info: formData.additionalInfo.trim() || null,
            };

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
                        published_at: new Date().toISOString(),
                    });
                error = insertError;
            }

            if (error) throw error;

            toast.success(isEditMode ? 'Vaga atualizada com sucesso!' : 'Vaga publicada com sucesso!');
            navigate('/vagas');
        } catch (error) {
            console.error('Erro ao salvar vaga:', error);
            toast.error('Erro ao salvar a vaga. Tente novamente.');
        } finally {
            setSaving(false);
        }
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
    ];

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Carregando vaga...</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
            {/* Header with gradient */}
            <div style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)',
                padding: '40px',
                marginBottom: '32px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative circles */}
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '200px',
                    height: '200px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.1)'
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '-80px',
                    left: '10%',
                    width: '300px',
                    height: '300px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)'
                }} />
                
                <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto' }}>
                    <button
                        onClick={() => navigate('/vagas')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            background: 'rgba(255, 255, 255, 0.15)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '14px',
                            marginBottom: '20px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                        }}
                    >
                        <ArrowLeft size={16} />
                        Voltar para Vagas
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.2)',
                            backdropFilter: 'blur(10px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Briefcase size={28} style={{ color: '#fff' }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#fff', margin: 0 }}>
                                {isEditMode ? 'Editar Vaga' : 'Criar Nova Vaga'}
                            </h1>
                            <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '14px', margin: '4px 0 0' }}>
                                {isEditMode ? 'Atualize as informações da vaga' : 'Preencha as informações para publicar uma nova oportunidade'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Content */}
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 40px 40px' }}>
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

                            {/* Location */}
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
        </div>
    );
};
