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
        age?: string | null;
        gender?: string | null;
        address?: string | null;
        portfolio?: string | null;
        cep?: string | null;
        address_number?: string | null;
        complement?: string | null;
        match_score?: number;
        notes?: string | null;
        answers?: Record<string, unknown>;
    };
    job: {
        id: string;
        title: string;
        job_code?: string | null;
        organization_id?: string | null;
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
    interface Pipeline { id: string; name: string; organization_id: string }
    const [allPipelines, setAllPipelines] = useState<Pipeline[]>([]);
    const [selectedExistingId, setSelectedExistingId] = useState<string>('');
    const [showSelection, setShowSelection] = useState(false);

    useEffect(() => {
        async function checkPipeline() {
            try {
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(job.id);
                console.log(`[checkPipeline] INICIANDO BUSCA CRÍTICA - Vaga: "${job.title}" (${job.id})`);

                // 1. Tentar busca direta por vaga_id (Independente de Org)
                if (isUuid) {
                    const { data: directPipes } = await supabase
                        .from('pipelines')
                        .select('id, name, organization_id')
                        .eq('vaga_id', job.id)
                        .limit(1);

                    if (directPipes && directPipes.length > 0) {
                        const found = directPipes[0];
                        console.log('[checkPipeline] SUCESSO - Encontrado via vaga_id:', found.id);
                        setPipelineId(found.id);
                        setHasPipeline(true);
                        // Sincronizar na vaga
                        await supabase.from('vagas_white_label').update({ pipeline_id: found.id }).eq('id', job.id);
                        return;
                    }

                    // Tentar ver se a vaga já tem o pipeline_id gravado
                    const { data: vaga } = await supabase
                        .from('vagas_white_label')
                        .select('pipeline_id')
                        .eq('id', job.id)
                        .maybeSingle();

                    if (vaga?.pipeline_id) {
                        console.log('[checkPipeline] SUCESSO - Encontrado via pipeline_id da vaga:', vaga.pipeline_id);
                        setPipelineId(vaga.pipeline_id);
                        setHasPipeline(true);
                        return;
                    }
                }

                // 2. Busca por Nome (Super Relaxada)
                const normalize = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/^pipeline\s*-\s*/i, '').replace(/[^\w\s]/g, '');
                const cleanJobTitle = normalize(job.title);
                console.log(`[checkPipeline] Buscando por nome limpo: "${cleanJobTitle}"`);

                // Tentar buscar em TODOS os pipelines que o usuário tem acesso
                const { data: allAccessiblePipes } = await supabase
                    .from('pipelines')
                    .select('id, name, organization_id');

                if (allAccessiblePipes && allAccessiblePipes.length > 0) {
                    console.log(`[checkPipeline] Analisando ${allAccessiblePipes.length} pipelines acessíveis...`);
                    
                    const match = allAccessiblePipes.find(p => {
                        const pName = normalize(p.name);
                        return pName === cleanJobTitle || pName.includes(cleanJobTitle) || cleanJobTitle.includes(pName);
                    });

                    if (match) {
                        console.log('[checkPipeline] SUCESSO - Match por nome encontrado:', match.name, match.id);
                        setPipelineId(match.id);
                        setHasPipeline(true);
                        
                        // Sincronizar para o futuro se tivermos o UUID da vaga
                        if (isUuid) {
                            await Promise.all([
                                supabase.from('vagas_white_label').update({ pipeline_id: match.id }).eq('id', job.id),
                                supabase.from('pipelines').update({ vaga_id: job.id }).eq('id', match.id)
                            ]);
                        }
                        return;
                    }
                    
                    // Se não achou match, guarda os pipelines da org do job (ou do perfil) para o dropdown
                    const targetOrgId = job.organization_id || profile?.organization_id;
                    setAllPipelines(allAccessiblePipes.filter(p => p.organization_id === targetOrgId));
                }

                console.warn('[checkPipeline] Pipeline não encontrado após busca exaustiva.');
                setHasPipeline(false);
            } catch (err) {
                console.error('[checkPipeline] Erro fatal:', err);
                setHasPipeline(false);
            }
        }
        if (profile?.organization_id || job.organization_id) {
            checkPipeline();
        }
    }, [job.id, profile?.organization_id, job.organization_id, job.title]);

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
                    user_id: profile.userId
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
        } catch (err: unknown) {
            toast.error('Erro ao criar pipeline: ' + (err as Error).message);
        } finally {
            setCreatingPipeline(false);
        }
    };

    const handleLinkExisting = async () => {
        if (!selectedExistingId) return;
        setLoading(true);
        try {
            await supabase
                .from('vagas_white_label')
                .update({ pipeline_id: selectedExistingId })
                .eq('id', job.id);

            await supabase
                .from('pipelines')
                .update({ vaga_id: job.id })
                .eq('id', selectedExistingId);

            setPipelineId(selectedExistingId);
            setHasPipeline(true);
            toast.success('Pipeline vinculado com sucesso!');
        } catch (err: unknown) {
            toast.error('Erro ao vincular pipeline: ' + (err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleTransfer = async (addToPipeline: boolean) => {
        setLoading(true);
        try {
            // 1. Preparar dados da análise para o histórico
            const ai = (candidate.answers?._ai_analysis || {}) as Record<string, unknown>;
            const analysisData = {
                score: candidate.match_score || 0,
                job_id: job.id,
                job_title: job.title,
                job_code: job.job_code,
                date: new Date().toISOString(),
                // Chaves reais do _ai_analysis (JobApplication.tsx): skills, strengths, gaps, summary
                skills: ai.skills || ai.Skills || ai.habilidades || ai.Habilidades,
                experience: ai.summary || ai.experience || ai.resumo || ai.analise_nota,
                positivePoints: ai.strengths || ai.positivePoints || ai.pontos_positivos || ai.positive_points,
                education: ai.education || ai.formacao || ai.escolaridade,
                redFlags: ai.gaps || ai.redFlags || ai.attention_points || ai.pontos_atencao || ai.negative_points || ai.pontos_negativos,
                resume_url: candidate.resume_url
            };

            const candidateRow = {
                name: candidate.name,
                email: candidate.email,
                phone: candidate.phone,
                location: candidate.location,
                linkedin: candidate.linkedin,
                resume_url: candidate.resume_url,
                age: candidate.age,
                gender: candidate.gender,
                address: candidate.address,
                portfolio: candidate.portfolio,
                cep: candidate.cep,
                address_number: candidate.address_number,
                complement: candidate.complement,
                organization_id: job.organization_id || profile.organization_id,
                user_id: profile.userId,
                score: candidate.match_score || 0,
                notes: candidate.notes
            };

            // Verificar se já existe um candidato com este email
            let existingQuery = supabase
                .from('candidates')
                .select('id, analysis')
                .eq('email', candidate.email);
            
            if (profile.organization_id) {
                existingQuery = existingQuery.eq('organization_id', profile.organization_id);
            }

            const { data: existingByEmail } = await existingQuery.maybeSingle();

            interface CandidateRecord { id: string; analysis?: { history?: Array<{ job_id: string }> }; resume_url?: string }
            let dbCandidate: CandidateRecord | null = null;

            if (existingByEmail) {
                // Candidato já existe -> mesclar histórico
                const existingHistory = Array.isArray(existingByEmail.analysis?.history)
                    ? existingByEmail.analysis.history
                    : [];
                
                const mergedAnalysis = {
                    ...analysisData,
                    history: [...existingHistory.filter((h: { job_id: string }) => h.job_id !== job.id), analysisData],
                    resume_url: candidate.resume_url
                };

                const { data: updated, error: updateError } = await supabase
                    .from('candidates')
                    .update({ ...candidateRow, analysis: mergedAnalysis })
                    .eq('id', existingByEmail.id)
                    .select()
                    .single();

                if (updateError) throw updateError;
                dbCandidate = updated;
            } else {
                // Candidato novo -> inserir com o primeiro item no histórico
                const newAnalysis = {
                    ...analysisData,
                    history: [analysisData],
                    resume_url: candidate.resume_url
                };

                const { data: inserted, error: insertError } = await supabase
                    .from('candidates')
                    .insert({ ...candidateRow, analysis: newAnalysis })
                    .select()
                    .single();

                if (insertError) throw insertError;
                dbCandidate = inserted;
            }

            if (!dbCandidate) throw new Error('Falha ao salvar candidato');

            // 1.5. Vincular à vaga no Banco de Talentos (tabela job_candidates)
            const { error: jcError } = await supabase
                .from('job_candidates')
                .upsert({
                    candidate_id: dbCandidate.id,
                    vaga_id: job.id,
                    job_id: job.id,
                    user_id: profile.userId,
                    score: candidate.match_score || 0,
                    status: 'Banco de Talentos'
                }, { onConflict: 'candidate_id,vaga_id' });
            
            if (jcError) {
                toast.error('Erro ao vincular vaga ao banco: ' + jcError.message);
            }

            // 2. Atualizar status na vaga original
            await supabase
                .from('vagas_candidaturas')
                .update({ status: 'talent_bank' })
                .eq('candidate_email', candidate.email)
                .eq('vaga_id', job.id);

            toast.success('Candidato movido para o Banco de Talentos!');

            // 3. Adicionar ao Pipeline se solicitado
            if (addToPipeline && pipelineId) {
                const { data: existingCard } = await supabase
                    .from('pipeline_cards')
                    .select('id')
                    .eq('pipeline_id', pipelineId)
                    .eq('candidate_id', dbCandidate.id)
                    .maybeSingle();

                if (!existingCard) {
                    const { data: firstCol } = await supabase
                        .from('pipeline_columns')
                        .select('id')
                        .eq('pipeline_id', pipelineId)
                        .order('position', { ascending: true })
                        .limit(1)
                        .maybeSingle();

                    if (firstCol) {
                        await supabase
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
                    }
                }
            }

            setStep('success');
            if (onSuccess) onSuccess();
        } catch (err: unknown) {
            console.error('Erro na transferência:', err);
            toast.error('Erro ao transferir: ' + (err as Error).message);
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
                                    borderRadius: '16px', padding: '20px', marginBottom: '24px'
                                }}>
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: showSelection ? '16px' : '0' }}>
                                        <AlertCircle size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', margin: '0 0 4px' }}>Pipeline não encontrado</p>
                                            <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '0 0 12px', lineHeight: '1.4' }}>
                                                Não conseguimos identificar automaticamente um processo para esta vaga. Deseja criar um novo ou vincular a um existente?
                                            </p>
                                            
                                            {!showSelection && (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button 
                                                        onClick={handleCreatePipeline}
                                                        disabled={creatingPipeline}
                                                        style={{ 
                                                            background: '#f59e0b', border: 'none', borderRadius: '8px', 
                                                            padding: '8px 12px', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', gap: 6
                                                        }}
                                                    >
                                                        {creatingPipeline ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <PipelineIcon size={12} />}
                                                        Criar Novo
                                                    </button>
                                                    <button 
                                                        onClick={() => setShowSelection(true)}
                                                        style={{ 
                                                            background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', 
                                                            padding: '8px 12px', color: 'var(--text-main)', fontSize: '11px', fontWeight: 600, cursor: 'pointer'
                                                        }}
                                                    >
                                                        Vincular Existente
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {showSelection && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'fadeIn 0.2s ease' }}>
                                            <select
                                                value={selectedExistingId}
                                                onChange={(e) => setSelectedExistingId(e.target.value)}
                                                style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--text-main)', fontSize: 13, outline: 'none', width: '100%' }}
                                            >
                                                <option value="">Selecione um processo...</option>
                                                {allPipelines.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    onClick={() => setShowSelection(false)}
                                                    style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', borderRadius: 10, padding: '8px', color: 'var(--text-dim)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handleLinkExisting}
                                                    disabled={!selectedExistingId || loading}
                                                    style={{ flex: 2, background: 'var(--primary)', border: 'none', borderRadius: 10, padding: '8px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: (!selectedExistingId || loading) ? 0.5 : 1 }}
                                                >
                                                    Vincular
                                                </button>
                                            </div>
                                        </div>
                                    )}
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
