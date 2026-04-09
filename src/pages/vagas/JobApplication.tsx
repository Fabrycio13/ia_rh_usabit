import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../core/services/supabase';
import toast from 'react-hot-toast';
import {
    ArrowLeft, User, Mail, Phone, Linkedin, MapPin, Upload, FileText,
    Send, CheckCircle, AlertCircle, Link as LinkIcon
} from 'lucide-react';

interface Job {
    id: string;
    title: string;
    company_name: string | null;
    has_location: boolean;
    location: string | null;
    work_model: string | null;
}

export const JobApplication = () => {
    const { hash } = useParams<{ hash: string }>();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        linkedin: '',
        location: '',
    });
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const fetchJob = async () => {
            if (!hash) return;

            try {
                const { data, error: err } = await supabase
                    .from('jobs')
                    .select('id, title, company_name, has_location, location, work_model, is_accepting_applications')
                    .eq('public_hash', hash)
                    .eq('is_active', true)
                    .single();

                if (err) throw err;
                
                if (!(data as any).is_accepting_applications) {
                    setError('Esta vaga não está mais aceitando candidaturas.');
                    return;
                }

                setJob(data as Job);
            } catch (err) {
                setError('Vaga não encontrada.');
            } finally {
                setLoading(false);
            }
        };

        fetchJob();
    }, [hash]);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check if PDF
            if (file.type !== 'application/pdf') {
                toast.error('Apenas arquivos PDF são aceitos.');
                return;
            }
            // Check size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                toast.error('O arquivo deve ter no máximo 10MB.');
                return;
            }
            setResumeFile(file);
        }
    };

    const uploadResume = async (): Promise<string | null> => {
        if (!resumeFile || !job) return null;

        setUploading(true);
        try {
            const fileExt = resumeFile.name.split('.').pop();
            const fileName = `${job.id}/${Date.now()}.${fileExt}`;
            const filePath = `resumes/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('job-applications')
                .upload(filePath, resumeFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('job-applications')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (err) {
            console.error('Error uploading resume:', err);
            toast.error('Erro ao enviar currículo. Tente novamente.');
            return null;
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.email.trim()) {
            toast.error('Preencha nome e e-mail.');
            return;
        }

        if (!resumeFile) {
            toast.error('Envie seu currículo em PDF.');
            return;
        }

        setSubmitting(true);
        try {
            const resumeUrl = await uploadResume();

            const { error: err } = await supabase
                .from('job_applications')
                .insert({
                    job_id: job!.id,
                    candidate_name: formData.name,
                    candidate_email: formData.email,
                    candidate_phone: formData.phone || null,
                    candidate_linkedin: formData.linkedin || null,
                    candidate_location: formData.location || null,
                    resume_url: resumeUrl,
                    resume_file_name: resumeFile?.name,
                    resume_file_size: resumeFile?.size,
                    source: 'public_link',
                });

            if (err) throw err;

            setSubmitted(true);
            toast.success('Candidatura enviada com sucesso!');
        } catch (err) {
            console.error('Error submitting application:', err);
            toast.error('Erro ao enviar candidatura. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '14px 16px',
        paddingLeft: '44px',
        background: '#0f1118',
        border: '1px solid #1f2332',
        borderRadius: '10px',
        color: '#f1f5f9',
        fontSize: '14px',
        outline: 'none',
        transition: 'all 0.2s',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        color: '#f1f5f9',
        fontSize: '14px',
        fontWeight: 600,
        marginBottom: '8px',
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#0B1020', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid rgba(99, 102, 241, 0.2)',
                        borderTopColor: 'var(--primary)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }} />
                    <p style={{ color: '#94a3b8', fontSize: '14px' }}>Carregando...</p>
                </div>
            </div>
        );
    }

    if (error || !job) {
        return (
            <div style={{ minHeight: '100vh', background: '#0B1020', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                <div style={{ textAlign: 'center', maxWidth: '500px' }}>
                    <AlertCircle size={64} style={{ color: '#ef4444', margin: '0 auto 24px' }} />
                    <h1 style={{ color: '#f1f5f9', fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
                        {error || 'Vaga não encontrada'}
                    </h1>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            marginTop: '32px',
                            padding: '14px 32px',
                            background: 'var(--primary)',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '15px',
                            fontWeight: 600
                        }}
                    >
                        Voltar ao início
                    </button>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div style={{ minHeight: '100vh', background: '#0B1020', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                <div style={{ textAlign: 'center', maxWidth: '600px', animation: 'fadeIn 0.5s ease-out' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px'
                    }}>
                        <CheckCircle size={40} style={{ color: '#fff' }} />
                    </div>
                    <h1 style={{ color: '#f1f5f9', fontSize: '32px', fontWeight: 700, marginBottom: '12px' }}>
                        Candidatura Enviada!
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: 1.6, marginBottom: '8px' }}>
                        Sua candidatura para a vaga <strong style={{ color: '#f1f5f9' }}>{job.title}</strong> foi enviada com sucesso.
                    </p>
                    {job.company_name && (
                        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '32px' }}>
                            {job.company_name} receberá sua candidatura e entrará em contato.
                        </p>
                    )}
                    <div style={{
                        background: '#1a1c2d',
                        borderRadius: '12px',
                        border: '1px solid #1f2332',
                        padding: '20px',
                        marginBottom: '32px'
                    }}>
                        <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
                            📧 Um e-mail de confirmação será enviado para <strong style={{ color: '#f1f5f9' }}>{formData.email}</strong>
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            padding: '14px 32px',
                            background: 'var(--primary)',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '15px',
                            fontWeight: 600
                        }}
                    >
                        Voltar ao início
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0B1020' }}>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>

            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)',
                padding: '32px 40px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '200px',
                    height: '200px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.1)'
                }} />
                
                <div style={{ position: 'relative', zIndex: 1, maxWidth: '700px', margin: '0 auto' }}>
                    <button
                        onClick={() => navigate(`/v/${hash}`)}
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
                            marginBottom: '16px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                    >
                        <ArrowLeft size={16} />
                        Voltar para a vaga
                    </button>
                    <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 700, margin: '0 0 8px' }}>
                        Candidate-se à Vaga
                    </h1>
                    <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '15px', margin: 0 }}>
                        {job.title}
                        {job.company_name && ` • ${job.company_name}`}
                    </p>
                </div>
            </div>

            {/* Form */}
            <div style={{ maxWidth: '700px', margin: '0 auto', padding: '40px' }}>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Personal Info */}
                        <div style={{
                            background: '#1a1c2d',
                            borderRadius: '16px',
                            border: '1px solid #1f2332',
                            padding: '28px'
                        }}>
                            <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 700, margin: '0 0 24px' }}>
                                Informações Pessoais
                            </h2>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Name */}
                                <div>
                                    <label style={labelStyle}>Nome Completo *</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => handleChange('name', e.target.value)}
                                            placeholder="Seu nome completo"
                                            style={inputStyle}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--primary)';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#1f2332';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label style={labelStyle}>E-mail *</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleChange('email', e.target.value)}
                                            placeholder="seu.email@exemplo.com"
                                            style={inputStyle}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--primary)';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#1f2332';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label style={labelStyle}>Telefone</label>
                                    <div style={{ position: 'relative' }}>
                                        <Phone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => handleChange('phone', e.target.value)}
                                            placeholder="(11) 99999-9999"
                                            style={inputStyle}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--primary)';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#1f2332';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* LinkedIn */}
                                <div>
                                    <label style={labelStyle}>LinkedIn</label>
                                    <div style={{ position: 'relative' }}>
                                        <Linkedin size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                        <input
                                            type="url"
                                            value={formData.linkedin}
                                            onChange={(e) => handleChange('linkedin', e.target.value)}
                                            placeholder="https://linkedin.com/in/seu-perfil"
                                            style={inputStyle}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--primary)';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#1f2332';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Location */}
                                <div>
                                    <label style={labelStyle}>Cidade / Estado</label>
                                    <div style={{ position: 'relative' }}>
                                        <MapPin size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(e) => handleChange('location', e.target.value)}
                                            placeholder="São Paulo, SP"
                                            style={inputStyle}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--primary)';
                                                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = '#1f2332';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Resume Upload */}
                        <div style={{
                            background: '#1a1c2d',
                            borderRadius: '16px',
                            border: '1px solid #1f2332',
                            padding: '28px'
                        }}>
                            <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 700, margin: '0 0 24px' }}>
                                Currículo
                            </h2>
                            
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                            
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    width: '100%',
                                    padding: '24px',
                                    background: resumeFile ? 'rgba(99, 102, 241, 0.1)' : '#0f1118',
                                    border: resumeFile ? '2px dashed var(--primary)' : '2px dashed #1f2332',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--primary)';
                                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)';
                                }}
                                onMouseLeave={(e) => {
                                    if (!resumeFile) {
                                        e.currentTarget.style.borderColor = '#1f2332';
                                        e.currentTarget.style.background = '#0f1118';
                                    }
                                }}
                            >
                                {resumeFile ? (
                                    <>
                                        <FileText size={32} style={{ color: 'var(--primary)' }} />
                                        <p style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 600, margin: 0 }}>
                                            {resumeFile.name}
                                        </p>
                                        <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
                                            {(resumeFile.size / 1024 / 1024).toFixed(2)} MB • Clique para trocar
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={32} style={{ color: '#64748b' }} />
                                        <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600, margin: 0 }}>
                                            Clique para enviar seu currículo
                                        </p>
                                        <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
                                            PDF até 10MB
                                        </p>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting || uploading}
                            style={{
                                padding: '16px 32px',
                                background: (submitting || uploading) ? '#64748b' : 'linear-gradient(135deg, var(--primary), #7c3aed)',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#fff',
                                cursor: (submitting || uploading) ? 'not-allowed' : 'pointer',
                                fontSize: '16px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.3s',
                                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
                                opacity: (submitting || uploading) ? 0.6 : 1
                            }}
                            onMouseEnter={(e) => {
                                if (!submitting && !uploading) {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(99, 102, 241, 0.5)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!submitting && !uploading) {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(99, 102, 241, 0.4)';
                                }
                            }}
                        >
                            {uploading ? (
                                <>
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        border: '3px solid rgba(255,255,255,0.2)',
                                        borderTopColor: '#fff',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite'
                                    }} />
                                    Enviando currículo...
                                </>
                            ) : submitting ? (
                                <>
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        border: '3px solid rgba(255,255,255,0.2)',
                                        borderTopColor: '#fff',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite'
                                    }} />
                                    Enviando candidatura...
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    Enviar Candidatura
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
