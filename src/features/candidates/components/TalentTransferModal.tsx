import { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Loader, GitMerge as PipelineIcon, UserPlus } from 'lucide-react';
import { supabase } from '../../../core/services/supabase';
import { useUser } from '../../../core/contexts/UserContext';
import toast from 'react-hot-toast';

interface TalentTransferModalProps {
    candidate: {
        id: string;
        name: string;
        email: string;
        phone?: string | null;
        location?: string | null;
        linkedin?: string | null;
        resume_url?: string | null;
        match_score?: number;
        answers?: any;
    };
    job: {
        id: string;
        title: string;
    };
    onClose: () => void;
    onSuccess?: () => void;
}

export function TalentTransferModal({ candidate, job, onClose, onSuccess }: TalentTransferModalProps) {
    const { profile } = useUser();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'confirm' | 'pipeline' | 'success'>('confirm');
    const [hasPipeline, setHasPipeline] = useState<boolean | null>(null);
    const [pipelineId, setPipelineId] = useState<string | null>(null);
    const [creatingPipeline, setCreatingPipeline] = useState(false);

    useEffect(() => {
        async function checkPipeline() {
            try {
                // 1. Verificar se a vaga já tem um pipeline_id vinculado
                const { data: vaga, error: vError } = await supabase
                    .from('vagas_white_label')
                    .select('pipeline_id')
                    .eq('id', job.id)
                    .single();

                if (!vError && vaga?.pipeline_id) {
                    setHasPipeline(true);
                    setPipelineId(vaga.pipeline_id);
                    return;
                }

                // 2. Se não tem no campo direto, buscar por vaga_id na tabela de pipelines
                const { data, error } = await supabase
                    .from('pipelines')
                    .select('id')
                    .eq('vaga_id', job.id)
                    .maybeSingle();

                if (!error && data) {
                    setHasPipeline(true);
                    setPipelineId(data.id);
                    
                    // Aproveitar e vincular na vaga para futuras consultas
                    await supabase
                        .from('vagas_white_label')
                        .update({ pipeline_id: data.id })
                        .eq('id', job.id);
                } else {
                    setHasPipeline(false);
                }
            } catch (err) {
                console.error('Erro ao verificar pipeline:', err);
                setHasPipeline(false);
            }
        }
        checkPipeline();
    }, [job.id]);

    const handleCreatePipeline = async () => {
        setCreatingPipeline(true);
        try {
            // Criar pipeline padrão para a vaga
            const { data, error } = await supabase
                .from('pipelines')
                .insert({
                    name: `Pipeline - ${job.title}`,
                    vaga_id: job.id,
                    organization_id: profile.organization_id,
                    user_id: profile.userId,
                    stages: ['Triagem', 'Entrevista', 'Proposta', 'Aprovado', 'Reprovado']
                })
                .select()
                .single();

            if (error) throw error;
            const newPipelineId = data.id;

            // Criar colunas padrão para o pipeline
            const defaultColumns = [
                { name: 'Triagem', color: '#6366f1', position: 0, pipeline_id: newPipelineId, user_id: profile.userId, organization_id: profile.organization_id, vaga_id: job.id },
                { name: 'Entrevista', color: '#0ea5e9', position: 1, pipeline_id: newPipelineId, user_id: profile.userId, organization_id: profile.organization_id, vaga_id: job.id },
                { name: 'Proposta', color: '#f59e0b', position: 2, pipeline_id: newPipelineId, user_id: profile.userId, organization_id: profile.organization_id, vaga_id: job.id },
                { name: 'Aprovado', color: '#22c55e', position: 3, pipeline_id: newPipelineId, user_id: profile.userId, organization_id: profile.organization_id, vaga_id: job.id },
                { name: 'Reprovado', color: '#ef4444', position: 4, pipeline_id: newPipelineId, user_id: profile.userId, organization_id: profile.organization_id, vaga_id: job.id },
            ];

            const { error: colError } = await supabase
                .from('pipeline_columns')
                .insert(defaultColumns);

            if (colError) throw colError;

            setPipelineId(newPipelineId);
            setHasPipeline(true);

            // VINCULAR PIPELINE À VAGA
            await supabase
                .from('vagas_white_label')
                .update({ pipeline_id: newPipelineId })
                .eq('id', job.id);

            toast.success('Pipeline e colunas criados com sucesso!');
        } catch (err: any) {
            toast.error('Erro ao criar pipeline: ' + err.message);
        } finally {
            setCreatingPipeline(false);
        }
    };

    const handleTransfer = async (addToPipeline: boolean) => {
        setLoading(true);
        try {
            // DEBUG: verificar dados disponíveis
            console.log('[Transfer] profile:', { userId: profile.userId, orgId: profile.organization_id, role: profile.user_role });
            console.log('[Transfer] candidate:', candidate);
            console.log('[Transfer] job:', job);

            // 1. Upsert na tabela candidates
            const analysisData = {
                score: candidate.match_score || 0,
                job_id: job.id,
                job_name: job.title,
                analyzed_at: new Date().toISOString(),
                summary: candidate.answers?._ai_analysis?.summary,
                gaps: candidate.answers?._ai_analysis?.gaps,
                strengths: candidate.answers?._ai_analysis?.strengths
            };

            const candidateRow = {
                name: candidate.name,
                email: candidate.email,
                phone: candidate.phone,
                location: candidate.location,
                linkedin: candidate.linkedin,
                resume_url: candidate.resume_url,
                organization_id: profile.organization_id,
                user_id: profile.userId,
                score: candidate.match_score || 0
            };

            // Verificar se já existe um candidato com este email na organização
            // Se organizationId não estiver disponível, buscar apenas pelo email
            let existingQuery = supabase
                .from('candidates')
                .select('id, analysis')
                .eq('email', candidate.email);
            
            if (profile.organization_id) {
                existingQuery = existingQuery.eq('organization_id', profile.organization_id);
            }

            const { data: existingByEmail, error: existingError } = await existingQuery.maybeSingle();
            console.log('[Transfer] existingByEmail:', existingByEmail, 'error:', existingError);

            // Preparar análise para candidato novo
            const existingHistory = Array.isArray(existingByEmail?.analysis?.history)
                ? existingByEmail.analysis.history
                : [];
            const newAnalysis = {
                ...analysisData,
                history: [...existingHistory.filter((h: any) => h.job_id !== job.id), analysisData]
            };


            let dbCandidate: any;

            if (existingByEmail) {
                // Candidato já existe → atualizar
                const mergedHistory = Array.isArray(existingByEmail.analysis?.history)
                    ? existingByEmail.analysis.history
                    : [];
                const mergedAnalysis = {
                    ...analysisData,
                    history: [...mergedHistory.filter((h: any) => h.job_id !== job.id), analysisData]
                };

                const { data: updated, error: updateError } = await supabase
                    .from('candidates')
                    .update({ ...candidateRow, analysis: mergedAnalysis })
                    .eq('id', existingByEmail.id)
                    .select()
                    .single();

                console.log('[Transfer] update result:', updated, 'error:', updateError);
                if (updateError) throw updateError;
                dbCandidate = updated;
            } else {
                // Candidato novo → inserir
                const { data: inserted, error: insertError } = await supabase
                    .from('candidates')
                    .insert({ ...candidateRow, analysis: newAnalysis })
                    .select()
                    .single();

                console.log('[Transfer] insert result:', inserted, 'error:', insertError);
                if (insertError) throw insertError;
                dbCandidate = inserted;
            }

            // 1.5. Vincular à vaga no Banco de Talentos (tabela job_candidates)
            // Isso garante que o candidato apareça "vindo desta vaga" no banco
            const { error: jcError } = await supabase
                .from('job_candidates')
                .upsert({
                    candidate_id: dbCandidate.id,
                    vaga_id: job.id,
                    user_id: profile.userId,
                    organization_id: profile.organization_id,
                    score: candidate.match_score || 0,
                    status: 'Banco de Talentos'
                }, { onConflict: 'candidate_id,vaga_id' });
            
            if (jcError) console.warn('[Transfer] jcError:', jcError);

            // 2. Atualizar status na vaga original (não-fatal)
            const { error: statusError } = await supabase
                .from('vagas_candidaturas')
                .update({ status: 'talent_bank' })
                .eq('candidate_email', candidate.email)
                .eq('vaga_id', job.id);

            if (statusError) {
                console.warn('[Transfer] statusError (não-fatal):', statusError);
            }

            // 3. Adicionar ao Pipeline se solicitado
            if (addToPipeline && pipelineId) {
                // Verificar se já existe no pipeline
                const { data: existingCard } = await supabase
                    .from('pipeline_cards')
                    .select('id')
                    .eq('pipeline_id', pipelineId)
                    .eq('candidate_id', dbCandidate.id)
                    .maybeSingle();

                if (!existingCard) {
                    // Buscar o ID da primeira coluna (Triagem)
                    const { data: firstCol } = await supabase
                        .from('pipeline_columns')
                        .select('id')
                        .eq('pipeline_id', pipelineId)
                        .order('position', { ascending: true })
                        .limit(1)
                        .maybeSingle();

                    if (firstCol) {
                        const { error: cardError } = await supabase
                            .from('pipeline_cards')
                            .insert({
                                pipeline_id: pipelineId,
                                candidate_id: dbCandidate.id,
                                column_id: firstCol.id,
                                position: 0,
                                user_id: profile.userId,
                                organization_id: profile.organization_id,
                                vaga_id: job.id,
                                notes: JSON.stringify({
                                    selected_job_id: job.id,
                                    selected_job_name: job.title,
                                    selected_job_score: candidate.match_score
                                })
                            });
                        if (cardError) throw cardError;
                    }
                }
            }

            setStep('success');
            if (onSuccess) onSuccess();
        } catch (err: any) {
            console.error('Erro na transferência:', err);
            toast.error('Erro ao transferir: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />
            
            <div style={{ 
                position: 'relative', width: '100%', maxWidth: '500px', 
                background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden', animation: 'modalAppear 0.3s ease-out'
            }}>
                {/* Header */}
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                            <UserPlus size={20} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>Transferir para Banco</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '32px 24px' }}>
                    {step === 'confirm' && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '16px', color: 'var(--text-main)', fontWeight: 500, marginBottom: '8px' }}>
                                    Deseja mover <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{candidate.name}</span> para o Banco de Talentos?
                                </div>
                                <p style={{ fontSize: '14px', color: 'var(--text-dim)', margin: 0 }}>
                                    O candidato ficará disponível para futuras oportunidades e seu histórico nesta vaga será preservado.
                                </p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button
                                    onClick={() => setStep('pipeline')}
                                    style={{ 
                                        width: '100%', padding: '14px', borderRadius: '14px', 
                                        background: 'var(--primary)', color: '#fff', border: 'none', 
                                        fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                                        transition: 'all 0.2s', boxShadow: '0 8px 16px rgba(99,102,241,0.2)'
                                    }}
                                >
                                    Sim, prosseguir
                                </button>
                                <button
                                    onClick={onClose}
                                    style={{ 
                                        width: '100%', padding: '14px', borderRadius: '14px', 
                                        background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', 
                                        fontSize: '15px', fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    Agora não
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'pipeline' && (
                        <div>
                            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                                <PipelineIcon size={40} style={{ color: 'var(--primary)', marginBottom: '16px', opacity: 0.8 }} />
                                <h4 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>Integração com Pipeline</h4>
                                <p style={{ fontSize: '14px', color: 'var(--text-dim)', margin: 0 }}>
                                    Deseja também iniciar o processo de triagem para este candidato?
                                </p>
                            </div>

                            {!hasPipeline && hasPipeline !== null && (
                                <div style={{ 
                                    background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', 
                                    borderRadius: '16px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '12px' 
                                }}>
                                    <AlertCircle size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                    <div>
                                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', margin: '0 0 4px' }}>Pipeline não encontrado</p>
                                        <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '0 0 12px' }}>
                                            Não existe um processo seletivo configurado para esta vaga. Deseja criar um agora?
                                        </p>
                                        <button 
                                            onClick={handleCreatePipeline}
                                            disabled={creatingPipeline}
                                            style={{ 
                                                background: '#f59e0b', border: 'none', borderRadius: '8px', 
                                                padding: '6px 12px', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                                            }}
                                        >
                                            {creatingPipeline ? 'Criando...' : 'Criar Pipeline Padrão'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button
                                    onClick={() => handleTransfer(true)}
                                    disabled={loading || !hasPipeline}
                                    style={{ 
                                        width: '100%', padding: '14px', borderRadius: '14px', 
                                        background: 'var(--primary)', color: '#fff', border: 'none', 
                                        fontSize: '15px', fontWeight: 700, cursor: !hasPipeline ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s', opacity: !hasPipeline ? 0.5 : 1,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    {loading ? <Loader size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                    Adicionar ao Banco e Iniciar Triagem
                                </button>
                                <button
                                    onClick={() => handleTransfer(false)}
                                    disabled={loading}
                                    style={{ 
                                        width: '100%', padding: '14px', borderRadius: '14px', 
                                        background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', border: '1px solid rgba(99, 102, 241, 0.2)', 
                                        fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Apenas Mover para Banco de Talentos
                                </button>
                                <button
                                    onClick={() => setStep('confirm')}
                                    style={{ 
                                        background: 'none', border: 'none', color: 'var(--text-dim)', 
                                        fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginTop: '8px'
                                    }}
                                >
                                    Voltar
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ 
                                width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e', 
                                margin: '0 auto 24px', animation: 'scaleUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                            }}>
                                <CheckCircle2 size={40} />
                            </div>
                            <h4 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 12px' }}>Sucesso!</h4>
                            <p style={{ fontSize: '15px', color: 'var(--text-dim)', margin: '0 0 32px', lineHeight: 1.6 }}>
                                O candidato agora faz parte do seu Banco de Talentos e seu status foi atualizado.
                            </p>
                            <button
                                onClick={onClose}
                                style={{ 
                                    width: '100%', padding: '14px', borderRadius: '14px', 
                                    background: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border)', 
                                    fontSize: '15px', fontWeight: 700, cursor: 'pointer'
                                }}
                            >
                                Fechar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes modalAppear {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes scaleUp {
                    from { transform: scale(0.5); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
