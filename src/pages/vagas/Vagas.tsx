import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../core/contexts/LangContext';
import { supabase } from '../../core/services/supabase';
import { Briefcase, Plus, Search, Filter, Edit, Trash2, Eye, ExternalLink, ChevronDown, Users, AlertTriangle, X, Mail, RefreshCw } from 'lucide-react';
import DatePicker from '../../common/components/ui/DatePicker';
import toast from 'react-hot-toast';
import { logActivity } from '../../core/services/logger';

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
/* Custom Select CSS */
.cs-container { position: relative; width: 220px; display: flex; align-items: center; gap: 12px; }
.cs-trigger { 
    display: flex; align-items: center; justify-content: space-between;
    background: var(--bg-input); border: 1px solid var(--border);
    border-radius: 10px; padding: 10px 16px; color: var(--text-main);
    font-size: 14px; cursor: pointer; transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    white-space: nowrap;
    flex: 1;
    height: 44px;
}
.cs-trigger:hover { border-color: var(--primary); }
.cs-dropdown {
    position: absolute; top: calc(100% + 8px); left: 0; min-width: 100%;
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 12px; padding: 8px; z-index: 1000;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    backdrop-filter: blur(16px); animation: csSlideUp 0.2s ease-out;
}
.cs-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 8px; color: var(--text-dim);
    font-size: 13px; cursor: pointer; transition: all 0.15s;
}
.cs-item:hover { background: var(--row-hover); color: var(--text-main); }
.cs-item.active { background: rgba(59, 130, 246, 0.15); color: #3b82f6; font-weight: 600; }
.cs-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
@keyframes csSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 768px) { .cs-container { width: 100% !important; } .cs-dropdown { right: 0; max-width: calc(100vw - 32px); } }
`;

type VagaStatus = 'aberta' | 'fechada' | 'pausada' | 'cancelada' | 'invisivel';

interface Vaga {
    id: string;
    title: string;
    public_hash: string;
    status: VagaStatus;
    is_active: boolean;
    is_accepting_applications: boolean;
    location: string | null;
    contract_type: string | null;
    application_count: number;
    created_at: string;
    organization_id: string | null;
    is_pcd: string;
    is_third_party: boolean;
    company_name: string | null;
    company_logo: string | null;
    show_company_name: boolean;
    job_code?: string;
    pipeline_id?: string | null;
    user_id?: string;
}

export const Vagas = ({ hideHeader = false }: { hideHeader?: boolean }) => {
    const { t } = useLang();
    const navigate = useNavigate();
    const [vagas, setVagas] = useState<Vaga[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [openStatusId, setOpenStatusId] = useState<string | null>(null);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; openUpward: boolean } | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [vagaToDelete, setVagaToDelete] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    
    // Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // States for Pipeline Deletion Confirmation
    const [pipelineDeleteModalOpen, setPipelineDeleteModalOpen] = useState(false);
    const [vagaForPipelineDelete, setVagaForPipelineDelete] = useState<string | null>(null);
    const [deletingPipeline, setDeletingPipeline] = useState(false);

    // States for Thank You Email Modal
    const [closeEmailVaga, setCloseEmailVaga] = useState<{ id: string; title: string } | null>(null);
    const [closeEmailVagaCount, setCloseEmailVagaCount] = useState<number | null>(null);
    const [sendingCloseEmails, setSendingCloseEmails] = useState(false);
    const [pendingPipelineDeleteFor, setPendingPipelineDeleteFor] = useState<string | null>(null);
    const [userOrgId, setUserOrgId] = useState<string>('');
    const [closeEmailBreakdown, setCloseEmailBreakdown] = useState<{
        approved: { name: string; email: string }[];
        rejected: { name: string; email: string }[];
        others: { name: string; email: string }[];
    } | null>(null);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

    const [closeEmailVagaType, setCloseEmailVagaType] = useState<'fechada' | 'cancelada' | null>(null);

    const [showReopenEmailModal, setShowReopenEmailModal] = useState(false);
    const [reopenEmailVagaId, setReopenEmailVagaId] = useState<string | null>(null);
    const [reopenCandidates, setReopenCandidates] = useState<{name: string; email: string}[]>([]);
    
    // Filtros Avançados
    const [userRole, setUserRole] = useState<string>('');
    const [organizations, setOrganizations] = useState<{id: string, name: string}[]>([]);
    const [selectedOrgId, setSelectedOrgId] = useState<string>('');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
    const [roleSearchTerm, setRoleSearchTerm] = useState('');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Controlled Selects state
    const [isOrgSelectOpen, setIsOrgSelectOpen] = useState(false);
    const [isStatusSelectOpen, setIsStatusSelectOpen] = useState(false);
    const [isRoleSelectOpen, setIsRoleSelectOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const check = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
        check(mq);
        mq.addEventListener('change', check);
        return () => mq.removeEventListener('change', check);
    }, []);
    
    const orgRef = useRef<HTMLDivElement>(null);
    const statusRef = useRef<HTMLDivElement>(null);
    const roleRef = useRef<HTMLDivElement>(null);
    const statusBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    // Cores para status
    const statusConfigMap: Record<VagaStatus, { bg: string; color: string; label: string }> = {
        aberta: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', label: 'Aberta' },
        fechada: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: 'Fechada' },
        pausada: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', label: 'Pausada' },
        cancelada: { bg: 'rgba(100, 116, 139, 0.1)', color: '#64748b', label: 'Cancelada' },
        invisivel: { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', label: 'Invisível' }
    };

     
    useEffect(() => {
        let currentUserId = '';

        const fetchInitialData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                currentUserId = user.id;

                // 1. Buscar Perfil/Role
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('user_role, organization_id')
                    .eq('id', user.id)
                    .single();
                
                const role = profile?.user_role || 'rh';
                const fetchedOrgId = profile?.organization_id;
                setUserRole(role);
                setUserOrgId(fetchedOrgId || '');

                // 2. Se for Owner, buscar organizações
                if (role === 'owner') {
                    // Buscar organizações que possuem usuários ativos
                    const { data: profilesData } = await supabase
                        .from('profiles')
                        .select('organization_id, organization_name')
                        .eq('status', 'active')
                        .not('organization_id', 'is', null);
                    
                    if (profilesData) {
                        const uniqueOrgs = profilesData.reduce((acc: {id: string, name: string}[], curr) => {
                            if (curr.organization_id && !acc.find(o => o.id === curr.organization_id)) {
                                acc.push({
                                    id: curr.organization_id,
                                    name: curr.organization_name || 'Nova Organização'
                                });
                            }
                            return acc;
                        }, []);
                        
                        setOrganizations(uniqueOrgs.sort((a, b) => a.name.localeCompare(b.name)));
                    }
                }

                // 3. Buscar Vagas
                let query = supabase
                    .from('vagas_white_label')
                    .select('id, title, public_hash, status, is_active, is_accepting_applications, location, contract_type, application_count, created_at, organization_id, is_pcd, is_third_party, company_name, company_logo, show_company_name, job_code, pipeline_id')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });

                // ISOLAMENTO: Todos os usuários veem apenas vagas da sua organização
                if (role === 'convidado') {
                    const { data: acesso } = await supabase
                        .from('convidado_vaga_access')
                        .select('vaga_id')
                        .eq('convidado_user_id', user.id);
                    const vagaIds = (acesso || []).map(a => a.vaga_id);
                    if (vagaIds.length === 0) {
                        setVagas([]);
                        setLoading(false);
                        return;
                    }
                    query = query.in('id', vagaIds);
                } else if (fetchedOrgId && fetchedOrgId !== 'null') {
                    query = query.or(`organization_id.eq.${fetchedOrgId},user_id.eq.${user.id}`);
                } else {
                    query = query.eq('user_id', user.id);
                }
                
                const { data, error } = await query;
                if (error) throw error;
                setVagas(data || []);
            } catch (err) {
                console.error('Erro ao buscar dados iniciais:', err);
                toast.error('Erro ao carregar informações');
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();

        // ─── Realtime Subscription for Vacancy Updates ──────────────────────
        // Ouvimos a tabela de vagas diretamente, pois o banco tem um trigger
        // que atualiza o application_count automaticamente.
        const channel = supabase
            .channel('vagas-updates-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*', // Ouvir Insert, Update e Delete
                    schema: 'public',
                    table: 'vagas_white_label'
                },
                (payload) => {
                    if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                        const updatedVaga = payload.new as Vaga;
                        // RH não pode ver vagas de outros usuários via Realtime
                        if (userRole === 'rh' && updatedVaga.user_id !== currentUserId) {
                            if (payload.eventType === 'INSERT') return;
                            // Para UPDATE, remove se não for do RH (vaza por engano)
                            setVagas(prev => prev.filter(v => v.id !== updatedVaga.id));
                            return;
                        }
                        setVagas(prev => {
                            // Se for update, atualiza o item. Se for insert e não estiver na lista, adiciona.
                            const exists = prev.some(v => v.id === updatedVaga.id);
                            if (exists) {
                                return prev.map(v => v.id === updatedVaga.id ? { ...v, ...updatedVaga } : v);
                            }
                            // Apenas adiciona se for ativo (regra da listagem)
                            return updatedVaga.is_active ? [updatedVaga, ...prev] : prev;
                        });
                    } else if (payload.eventType === 'DELETE') {
                        const oldId = (payload.old as { id?: string }).id;
                        setVagas(prev => prev.filter(v => v.id === oldId));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fechar selects ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (orgRef.current && !orgRef.current.contains(event.target as Node)) setIsOrgSelectOpen(false);
            if (statusRef.current && !statusRef.current.contains(event.target as Node)) setIsStatusSelectOpen(false);
            if (roleRef.current && !roleRef.current.contains(event.target as Node)) setIsRoleSelectOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const openDeleteModal = (id: string) => {
        setVagaToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!vagaToDelete) return;
        setDeleting(true);

        try {
            const vaga = vagas.find(v => v.id === vagaToDelete);

            await supabase.from('vagas_candidaturas').delete().eq('vaga_id', vagaToDelete);

            if (vaga?.pipeline_id) {
                await supabase.from('pipelines').delete().eq('id', vaga.pipeline_id);
            }

            const { error } = await supabase
                .from('vagas_white_label')
                .delete()
                .eq('id', vagaToDelete);

            if (error) throw error;

            setVagas(prev => prev.filter(v => v.id !== vagaToDelete));
            toast.success('Vaga excluída permanentemente');

            const { data: { user } } = await supabase.auth.getUser();
            if (user && vaga) {
                logActivity(user.id, `Excluiu a vaga: "${vaga.title}"`).catch(console.error);
            }
        } catch (err) {
            console.error('Erro ao excluir vaga:', err);
            toast.error('Erro ao excluir vaga');
        } finally {
            setDeleting(false);
            setDeleteModalOpen(false);
            setVagaToDelete(null);
        }
    };

    const cancelDelete = () => {
        setDeleteModalOpen(false);
        setVagaToDelete(null);
    };

    const updateVagaStatus = async (id: string, status: VagaStatus) => {
        try {
            // Sincronizar booleanos legados com o novo status
            const updates = {
                status,
                is_accepting_applications: status === 'aberta' || status === 'invisivel',
            };

            const { error: vagaError } = await supabase
                .from('vagas_white_label')
                .update(updates)
                .eq('id', id);

            if (vagaError) throw vagaError;

            // Atualizar pipeline associado (se existir)
            if (status === 'pausada') {
                // Desativar pipeline (só pausada desativa sem confirmacao)
                await supabase
                    .from('pipelines')
                    .update({ is_active: false })
                    .eq('vaga_id', id);
            } else if (status === 'cancelada' || status === 'fechada') {
                // Ainda nao desativa — aguarda confirmacao do modal
            } else {
                // Reativar pipeline
                await supabase
                    .from('pipelines')
                    .update({ is_active: true })
                    .eq('vaga_id', id);
            }

            const vagaAtual = vagas.find(v => v.id === id);

            // Reabertura de vaga cancelada
            if (status === 'aberta' && vagaAtual?.status === 'cancelada') {
                const breakdown = await computeCloseEmailBreakdown(id);
                const allCandidates = breakdown
                    ? [...breakdown.approved, ...breakdown.rejected, ...breakdown.others].filter(c => c.email && c.email.includes('@'))
                    : [];

                if (allCandidates.length > 0) {
                    setReopenCandidates(allCandidates);
                    setReopenEmailVagaId(id);
                    setShowReopenEmailModal(true);
                } else {
                    setVagas(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
                    toast.success(`Status alterado para "Aberta"`);
                }
                return;
            }

            // Se cancelada ou fechada, primeiro perguntar sobre e-mails, depois sobre pipeline
            if (status === 'cancelada' || status === 'fechada') {
                // Buscar organization_id se ainda não tiver
                if (!userOrgId) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('organization_id')
                            .eq('id', user.id)
                            .single();
                        if (profile?.organization_id) {
                            setUserOrgId(profile.organization_id);
                        }
                    }
                }

                // Buscar breakdown de candidatos
                const breakdown = await computeCloseEmailBreakdown(id);

                // Primeiro: modal de e-mail se houver candidatos
                if (breakdown && breakdown.approved.length + breakdown.rejected.length + breakdown.others.length > 0) {
                    const total = breakdown.approved.length + breakdown.rejected.length + breakdown.others.length;
                    setCloseEmailVagaType(status === 'cancelada' ? 'cancelada' : 'fechada');
                    setCloseEmailVagaCount(total);
                    setCloseEmailBreakdown(breakdown);
                    setCloseEmailVaga({ id, title: vagaAtual?.title || '' });
                    // Guarda para mostrar modal de pipeline depois
                    if (vagaAtual?.pipeline_id) {
                        setPendingPipelineDeleteFor(id);
                    }
                } else if (vagaAtual?.pipeline_id) {
                    // Sem candidatos: vai direto para pipeline
                    setVagaForPipelineDelete(id);
                    setPipelineDeleteModalOpen(true);
                }
            }

            setVagas(prev => prev.map(v =>
                v.id === id ? { ...v, ...updates } : v
            ));

            const statusLabels = { aberta: 'Aberta', fechada: 'Fechada', pausada: 'Pausada', cancelada: 'Cancelada', invisivel: 'Invisível' };
            toast.success(`Status alterado para "${statusLabels[status]}"`);
            setOpenStatusId(null);

            // Log de alteração de status
            const vaga = vagas.find(v => v.id === id);
            const { data: { user } } = await supabase.auth.getUser();
            if (user && vaga) {
                logActivity(user.id, `Alterou status da vaga para "${statusLabels[status]}": "${vaga.title}"`).catch(console.error);
            }
        } catch (err) {
            console.error('Erro ao atualizar status:', err);
            toast.error('Erro ao atualizar status');
        }
    };

    const confirmPipelineDelete = async () => {
        if (!vagaForPipelineDelete) return;
        setDeletingPipeline(true);
        try {
            const { error: deleteError } = await supabase
                .from('pipelines')
                .delete()
                .eq('vaga_id', vagaForPipelineDelete);

            if (deleteError) throw deleteError;
            
            toast.success('Pipeline excluído com sucesso');
            
            // Log de exclusão
            const vaga = vagas.find(v => v.id === vagaForPipelineDelete);
            const { data: { user } } = await supabase.auth.getUser();
            if (user && vaga) {
                logActivity(user.id, `Excluiu o pipeline associado à vaga: "${vaga.title}"`).catch(console.error);
            }
        } catch (err) {
            console.error('Erro ao deletar pipeline:', err);
            toast.error('Erro ao excluir pipeline associado');
        } finally {
            setDeletingPipeline(false);
            setPipelineDeleteModalOpen(false);
            setVagaForPipelineDelete(null);
        }
    };

    const cancelPipelineDelete = async () => {
        setPipelineDeleteModalOpen(false);
        setVagaForPipelineDelete(null);
    };

    const getStatusFromVaga = (vaga: Vaga): VagaStatus => {
        return vaga.status || 'aberta';
    };

    const getStatusConfig = (status: VagaStatus) => {
        return statusConfigMap[status] || statusConfigMap.aberta;
    };

    const getContractTypeLabel = (type: string | null) => {
        const labels: Record<string, string> = {
            clt: 'CLT',
            pj: 'PJ',
            estagio: 'Estágio',
            freelancer: 'Freelancer'
        };
        return type ? labels[type] || type : '-';
    };

    const getPublicJobUrl = (hash: string, adminMode = false) => {
        // App uses HashRouter, so we need the hash symbol
        // Normalizamos o origin + pathname para evitar barras duplas
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '');
        const url = `${baseUrl}/#/v/${hash}`;
        return adminMode ? `${url}?preview=true` : url;
    };

    const copyPublicLink = (hash: string) => {
        navigator.clipboard.writeText(getPublicJobUrl(hash));
        toast.success('Link copiado!');
    };

    async function computeCloseEmailBreakdown(vagaId: string) {
        // Busca sem filtro de organization_id para incluir candidaturas legadas (sem org_id)
        // e candidaturas criadas antes da migration 049
        const { data: allCandidaturas } = await supabase
            .from('vagas_candidaturas')
            .select('candidate_name, candidate_email, status')
            .eq('vaga_id', vagaId);

        if (!allCandidaturas?.length) return null;

        // Candidatos que foram ao banco de talentos — precisam verificar coluna do kanban
        const talentBank = allCandidaturas.filter(c => c.status === 'talent_bank');
        const approvedEmails = new Set<string>();
        // Candidatos fora do banco de talentos já são reprovados diretamente
        const notInBankEmails = new Set<string>(
            allCandidaturas
                .filter(c => c.status !== 'talent_bank')
                .map(c => c.candidate_email)
        );

        if (talentBank.length > 0) {
            // Busca o pipeline ativo vinculado à vaga (prioriza is_active=true)
            const { data: activePipeline } = await supabase
                .from('pipelines')
                .select('id')
                .eq('vaga_id', vagaId)
                .eq('is_active', true)
                .maybeSingle();

            // Fallback: se não houver pipeline ativo, tenta qualquer pipeline da vaga
            const { data: anyPipeline } = !activePipeline
                ? await supabase
                    .from('pipelines')
                    .select('id')
                    .eq('vaga_id', vagaId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()
                : { data: null };

            const pipeline = activePipeline ?? anyPipeline;

            if (pipeline) {
                const tbEmails = talentBank.map(c => c.candidate_email);
                const { data: candidatesTable } = await supabase
                    .from('candidates')
                    .select('id, email')
                    .in('email', tbEmails);

                if (candidatesTable?.length) {
                    const candidateIds = candidatesTable.map(c => c.id);
                    const emailById: Record<string, string> = {};
                    candidatesTable.forEach(c => { emailById[c.id] = c.email; });

                    const { data: pipelineCards } = await supabase
                        .from('pipeline_cards')
                        .select('candidate_id, column_id')
                        .eq('pipeline_id', pipeline.id)
                        .in('candidate_id', candidateIds);

                    if (pipelineCards?.length) {
                        const colIds = [...new Set(pipelineCards.map(pc => pc.column_id))];
                        const { data: columns } = await supabase
                            .from('pipeline_columns')
                            .select('id, name')
                            .in('id', colIds);

                        const colNamesById: Record<string, string> = {};
                        columns?.forEach(col => { colNamesById[col.id] = col.name; });

                        pipelineCards.forEach(pc => {
                            const email = emailById[pc.candidate_id];
                            if (!email) return;
                            const colName = colNamesById[pc.column_id] || '';
                            if (colName === 'Aprovado') {
                                approvedEmails.add(email);
                            }
                            // Qualquer outra coluna no kanban = reprovado (já tratado abaixo)
                        });
                    }
                }
            }
        }

        const approved: { name: string; email: string }[] = [];
        const rejected: { name: string; email: string }[] = [];
        const others: { name: string; email: string }[] = [];

        allCandidaturas.forEach(c => {
            const entry = { name: c.candidate_name || 'Sem nome', email: c.candidate_email };
            if (approvedEmails.has(c.candidate_email)) {
                // Foi pro banco e está na coluna "Aprovado" do kanban
                approved.push(entry);
            } else if (notInBankEmails.has(c.candidate_email)) {
                // Não foi pro banco de talentos = reprovado direto
                rejected.push(entry);
            } else {
                // Foi pro banco mas não está no kanban ou está em coluna diferente de "Aprovado"
                others.push(entry);
            }
        });

        return { approved, rejected, others };
    }

    async function sendCloseEmails(vagaId: string, tipo: 'fechada' | 'cancelada' = 'fechada') {
        if (sendingCloseEmails) return;
        setSendingCloseEmails(true);
        try {
            const breakdown = closeEmailBreakdown ?? await computeCloseEmailBreakdown(vagaId);
            if (!breakdown) {
                toast.success('Nenhum candidato para notificar');
                setCloseEmailVaga(null);
                setCloseEmailVagaCount(null);
                setCloseEmailBreakdown(null);
                setCloseEmailVagaType(null);
                return;
            }

            const allCandidaturas = [
                ...breakdown.approved,
                ...breakdown.rejected,
                ...breakdown.others,
            ].filter(c => c.email && c.email.includes('@'));

            if (allCandidaturas.length === 0) {
                toast.success('Nenhum candidato para notificar');
                setCloseEmailVaga(null);
                setCloseEmailVagaCount(null);
                setCloseEmailBreakdown(null);
                setCloseEmailVagaType(null);
                return;
            }

            const approvedEmails = new Set(breakdown.approved.map(c => c.email));

            const results = await Promise.allSettled(
                allCandidaturas.map(async c => {
                    if (tipo === 'cancelada') {
                        return supabase.functions.invoke('send-candidate-vaga-canceled-email', {
                            body: { candidateEmail: c.email, vagaId }
                        });
                    }

                    const isApproved = approvedEmails.has(c.email);

                    if (isApproved) {
                        return supabase.functions.invoke('send-candidate-congratulations-email', {
                            body: { candidateEmail: c.email, vagaId }
                        });
                    }
                    return supabase.functions.invoke('send-candidate-thankyou-email', {
                        body: { candidateEmail: c.email, vagaId }
                    });
                })
            );

            const sent = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            if (failed > 0) {
                toast.success(`${sent} e-mails enviados, ${failed} falhas`);
            } else {
                toast.success(`${sent} e-mail${sent !== 1 ? 's' : ''} enviado${sent !== 1 ? 's' : ''}`);
            }
        } catch (err) {
            console.error('Erro ao enviar e-mails:', err);
            toast.error('Erro ao enviar e-mails');
        } finally {
            setSendingCloseEmails(false);
            const pendingId = pendingPipelineDeleteFor;
            setCloseEmailVaga(null);
            setCloseEmailVagaCount(null);
            setCloseEmailBreakdown(null);
            setCloseEmailVagaType(null);
            setPendingPipelineDeleteFor(null);
            if (pendingId) {
                setVagaForPipelineDelete(pendingId);
                setPipelineDeleteModalOpen(true);
            }
        }
    }

    async function sendReopenedEmails() {
        if (sendingCloseEmails || !reopenEmailVagaId) return;
        setSendingCloseEmails(true);
        try {
            const validCandidates = reopenCandidates.filter(c => c.email && c.email.includes('@'));
            if (validCandidates.length === 0) {
                toast.success('Nenhum candidato para notificar');
                setShowReopenEmailModal(false);
                setReopenCandidates([]);
                setReopenEmailVagaId(null);
                return;
            }

            const results = await Promise.allSettled(
                validCandidates.map(c =>
                    supabase.functions.invoke('send-candidate-vaga-reopened-email', {
                        body: { candidateEmail: c.email, vagaId: reopenEmailVagaId }
                    })
                )
            );

            const sent = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            if (failed > 0) {
                toast.success(`${sent} notificações enviadas, ${failed} falhas`);
            } else {
                toast.success(`${sent} candidat${sent !== 1 ? 'os' : 'a'} notificado${sent !== 1 ? 's' : ''} sobre a reabertura`);
            }
        } catch (err) {
            console.error('Erro ao enviar notificações:', err);
            toast.error('Erro ao enviar notificações');
        } finally {
            setSendingCloseEmails(false);
            setOpenStatusId(null);
            if (reopenEmailVagaId) {
                setVagas(prev => prev.map(v =>
                    v.id === reopenEmailVagaId ? { ...v, status: 'aberta' as const, is_accepting_applications: true } : v
                ));
            }
            setShowReopenEmailModal(false);
            setReopenCandidates([]);
            setReopenEmailVagaId(null);
        }
    }

    // Lógica de Filtragem Avançada
    const filteredVagas = vagas.filter(vaga => {
        // 1. Busca por texto
        const searchUpper = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || 
            vaga.title.toLowerCase().includes(searchUpper) ||
            (vaga.location || '').toLowerCase().includes(searchUpper) ||
            (vaga.contract_type || '').toLowerCase().includes(searchUpper) ||
            (vaga.job_code || '').toLowerCase().includes(searchUpper);

        // 2. Filtro por Organização (Owner only)
        const matchesOrg = !selectedOrgId || vaga.organization_id === selectedOrgId;

        // 3. Filtro por Status
        const currentStatus = getStatusFromVaga(vaga);
        const matchesStatus = !selectedStatusFilter || currentStatus === selectedStatusFilter;

        // 4. Filtro por Cargo (Role) ou Código
        const matchesRole = !selectedRoleFilter || vaga.title === selectedRoleFilter || vaga.id === selectedRoleFilter || vaga.job_code === selectedRoleFilter;

        // 5. Filtro por Data (Criada em)
        const vagaDate = vaga.created_at.slice(0, 10); // YYYY-MM-DD
        const matchesStart = !startDate || vagaDate >= startDate;
        const matchesEnd = !endDate || vagaDate <= endDate;

        return matchesSearch && matchesOrg && matchesRole && matchesStatus && matchesStart && matchesEnd;
    });

    // Reset pagination on filter change (called inline from filter handlers)
    // to avoid setState-in-useEffect.

    const totalPages = Math.ceil(filteredVagas.length / itemsPerPage);
    const paginatedVagas = filteredVagas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Lista de cargos e códigos para o filtro
    const roleOptions = vagas.map(v => ({
        id: v.id,
        title: v.title,
        job_code: v.job_code
    })).filter(v => 
        !roleSearchTerm || 
        v.title.toLowerCase().includes(roleSearchTerm.toLowerCase()) || 
        (v.job_code || '').toLowerCase().includes(roleSearchTerm.toLowerCase())
    ).sort((a, b) => a.title.localeCompare(b.title));

    return (
        <div style={{ padding: hideHeader ? '0' : '0 40px 40px' }}>
            <style>{css}</style>
            
            {/* Header */}
            {!hideHeader && (
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <Briefcase size={isMobile ? 24 : 32} style={{ color: 'var(--primary)' }} />
                        <h1 style={{ fontSize: isMobile ? '22px' : '32px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                            {t('vagas')}
                        </h1>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                        Gerencie suas vagas e publique novas oportunidades
                    </p>
                </div>
            )}

            {/* Actions Bar */}
            <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '24px',
                flexWrap: 'wrap'
            }}>
                {/* Search */}
                <div style={{
                    flex: isMobile ? '1 1 100%' : '1',
                    minWidth: isMobile ? 'auto' : '250px',
                    order: isMobile ? 3 : 0,
                    position: 'relative'
                }}>
                    <Search size={18} style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)'
                    }} />
                    <input
                        type="text"
                        placeholder="Buscar vagas..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        style={{
                            width: '100%',
                            padding: '12px 16px 12px 40px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            color: 'var(--text-main)',
                            fontSize: '14px',
                            outline: 'none'
                        }}
                    />
                </div>

                {/* Organização Filter (Only for Owner) */}
                {userRole === 'owner' && (
                    <div className="cs-container" ref={orgRef}>
                        <div className="cs-trigger" onClick={() => setIsOrgSelectOpen(!isOrgSelectOpen)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                <Users size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {selectedOrgId ? organizations.find(o => o.id === selectedOrgId)?.name : 'Todas Organizações'}
                                </span>
                            </div>
                            <ChevronDown size={14} style={{ transform: isOrgSelectOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        </div>
                        {isOrgSelectOpen && (
                            <div className="cs-dropdown">
                                <div 
                                    className={`cs-item ${!selectedOrgId ? 'active' : ''}`}
                                    onClick={() => { setSelectedOrgId(''); setIsOrgSelectOpen(false); setCurrentPage(1); }}
                                >
                                    <div className="cs-dot" style={{ background: 'var(--text-muted)' }} />
                                    Todas Organizações
                                </div>
                                {organizations.map(org => (
                                    <div 
                                        key={org.id}
                                        className={`cs-item ${selectedOrgId === org.id ? 'active' : ''}`}
                                        onClick={() => { setSelectedOrgId(org.id); setIsOrgSelectOpen(false); setCurrentPage(1); }}
                                    >
                                        <div className="cs-dot" style={{ background: 'var(--primary)' }} />
                                        {org.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Cargo Filter */}
                <div className="cs-container" ref={roleRef} style={{ width: '350px' }}>
                    <div className="cs-trigger" onClick={() => setIsRoleSelectOpen(!isRoleSelectOpen)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                            <Briefcase size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {selectedRoleFilter ? (() => {
                                    const v = vagas.find(v => v.id === selectedRoleFilter || v.title === selectedRoleFilter || v.job_code === selectedRoleFilter);
                                    return v ? `${v.title} ${v.job_code ? `[${v.job_code}]` : ''}` : selectedRoleFilter;
                                })() : 'Todos Cargos'}
                            </span>
                        </div>
                        <ChevronDown size={14} style={{ transform: isRoleSelectOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                    </div>
                        {isRoleSelectOpen && (
                            <div className="cs-dropdown" style={{ minWidth: '250px' }}>
                                <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                                    <input 
                                        autoFocus
                                        placeholder="Pesquisar vaga ou código..."
                                        value={roleSearchTerm}
                                        onChange={e => setRoleSearchTerm(e.target.value)}
                                        onClick={e => e.stopPropagation()}
                                        style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text-main)', fontSize: 12, outline: 'none' }}
                                    />
                                </div>
                                <div 
                                    className={`cs-item ${!selectedRoleFilter ? 'active' : ''}`}
                                    onClick={() => { setSelectedRoleFilter(''); setRoleSearchTerm(''); setIsRoleSelectOpen(false); setCurrentPage(1); }}
                                >
                                    <div className="cs-dot" style={{ background: 'var(--text-muted)' }} />
                                    Todos Cargos
                                </div>
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {roleOptions.map(opt => (
                                        <div 
                                            key={opt.id}
                                            className={`cs-item ${selectedRoleFilter === opt.id ? 'active' : ''}`}
                                            onClick={() => { setSelectedRoleFilter(opt.id); setRoleSearchTerm(''); setIsRoleSelectOpen(false); setCurrentPage(1); }}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                                <div className="cs-dot" style={{ background: '#3b82f6', flexShrink: 0 }} />
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.title}</span>
                                            </div>
                                            {opt.job_code && <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700, marginLeft: 8, flexShrink: 0 }}>{opt.job_code}</span>}
                                        </div>
                                    ))}
                                    {roleOptions.length === 0 && (
                                        <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>Nenhuma vaga encontrada</div>
                                    )}
                                </div>
                            </div>
                        )}
                </div>

                {/* Status Filter */}
                <div className="cs-container" ref={statusRef} style={{ width: '180px' }}>
                    <div className="cs-trigger" onClick={() => setIsStatusSelectOpen(!isStatusSelectOpen)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Filter size={16} style={{ color: '#10b981' }} />
                            <span>
                                {selectedStatusFilter ? statusConfigMap[selectedStatusFilter as VagaStatus].label : 'Todos Status'}
                            </span>
                        </div>
                        <ChevronDown size={14} style={{ transform: isStatusSelectOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                    </div>
                    {isStatusSelectOpen && (
                        <div className="cs-dropdown">
                            <div 
                                className={`cs-item ${!selectedStatusFilter ? 'active' : ''}`}
                                onClick={() => { setSelectedStatusFilter(''); setIsStatusSelectOpen(false); setCurrentPage(1); }}
                            >
                                <div className="cs-dot" style={{ background: 'var(--text-muted)' }} />
                                Todos Status
                            </div>
                            {(Object.keys(statusConfigMap) as VagaStatus[]).map(status => (
                                <div 
                                    key={status}
                                    className={`cs-item ${selectedStatusFilter === status ? 'active' : ''}`}
                                    onClick={() => { setSelectedStatusFilter(status); setIsStatusSelectOpen(false); setCurrentPage(1); }}
                                >
                                    <div className="cs-dot" style={{ background: statusConfigMap[status].color }} />
                                    {statusConfigMap[status].label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Period Filter */}
                <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: 12, marginLeft: isMobile ? 0 : 'auto', flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto', order: isMobile ? 2 : 0 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 600 }}>Período:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', flex: isMobile ? 1 : 'none', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, opacity: 0.8 }}>De:</span>
                            <DatePicker compact value={startDate} onChange={val => { setStartDate(val); setCurrentPage(1); }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, opacity: 0.8 }}>Até:</span>
                            <DatePicker compact value={endDate} onChange={val => { setEndDate(val); setCurrentPage(1); }} />
                        </div>
                        {/* Clear Filters */}
                        {(searchTerm || selectedOrgId || selectedStatusFilter || selectedRoleFilter || startDate || endDate) && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setSelectedOrgId('');
                                    setSelectedStatusFilter('');
                                    setSelectedRoleFilter('');
                                    setStartDate('');
                                    setEndDate('');
                                    setCurrentPage(1);
                                }}
                                style={{ 
                                    background: 'transparent', 
                                    border: '1px solid var(--error-border)', 
                                    borderRadius: '8px', 
                                    padding: '8px 14px', 
                                    color: 'var(--text-error)', 
                                    fontSize: '12px', 
                                    fontWeight: 600, 
                                    cursor: 'pointer', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px' 
                                }}
                            >
                                <X size={14} /> Limpar
                            </button>
                        )}
                    </div>
                </div>

                {/* Create New Vaga */}
                {userRole !== 'convidado' && (
                <button
                    onClick={() => navigate('/vagas/nova')}
                    style={{
                        padding: '12px 24px',
                        background: 'var(--primary)',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '14px',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        width: isMobile ? '100%' : 'auto',
                        order: isMobile ? -1 : 0,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.85)'}
                    onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                >
                    <Plus size={16} />
                    Nova Vaga
                </button>
                )}
            </div>

            {/* Vagas List */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                overflow: 'hidden'
            }}>
                {loading ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p>Carregando vagas...</p>
                    </div>
                ) : filteredVagas.length === 0 ? (
                    <div style={{
                        padding: '60px 20px',
                        textAlign: 'center',
                        color: 'var(--text-muted)'
                    }}>
                        <Briefcase size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <p style={{ fontSize: '16px', marginBottom: '8px' }}>Nenhuma vaga encontrada</p>
                        <p style={{ fontSize: '14px' }}>Crie uma nova vaga para começar</p>
                    </div>
                ) : isMobile ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
                        {paginatedVagas.map((vaga) => {
                            const currentStatus = getStatusFromVaga(vaga);
                            const statusConfig = getStatusConfig(currentStatus);
                            const isStatusOpen = openStatusId === vaga.id;

                            return (
                                <div key={vaga.id} style={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    padding: '14px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '13px' }}>
                                            {vaga.job_code || '-'}
                                        </span>
                                        <div style={{ position: 'relative' }}>
                                            {userRole === 'convidado' ? (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                    padding: '4px 10px', background: statusConfig.bg,
                                                    border: `1px solid ${statusConfig.color}33`,
                                                    borderRadius: '12px', color: statusConfig.color,
                                                    fontSize: '12px', fontWeight: 600
                                                }}>
                                                    {statusConfig.label}
                                                </span>
                                            ) : (
                                                <button ref={(el) => { statusBtnRefs.current[vaga.id] = el; }}
                                                    onClick={() => {
                                                        if (isStatusOpen) { setOpenStatusId(null); setDropdownPos(null); }
                                                        else {
                                                            const btn = statusBtnRefs.current[vaga.id];
                                                            if (btn) {
                                                                const rect = btn.getBoundingClientRect();
                                                                const STATUS_ITEMS = 5, ITEM_HEIGHT = 42, DROPDOWN_PAD = 12;
                                                                const estimatedHeight = DROPDOWN_PAD + STATUS_ITEMS * ITEM_HEIGHT;
                                                                const spaceBelow = window.innerHeight - rect.bottom;
                                                                const spaceAbove = rect.top;
                                                                const openUpward = spaceBelow < estimatedHeight + 20 && spaceAbove >= estimatedHeight;
                                                                setDropdownPos({ top: openUpward ? rect.top - 8 : rect.bottom + 8, left: rect.left + rect.width / 2, openUpward });
                                                            }
                                                            setOpenStatusId(vaga.id);
                                                        }
                                                    }}
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                        padding: '6px 12px', background: statusConfig.bg,
                                                        border: `1px solid ${statusConfig.color}33`,
                                                        borderRadius: '12px', color: statusConfig.color,
                                                        cursor: 'pointer', fontSize: '12px', fontWeight: 600, minHeight: '36px',
                                                    }}
                                                >
                                                    {statusConfig.label}
                                                    <ChevronDown size={12} style={{ transition: 'transform 0.2s', transform: isStatusOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div onClick={() => navigate(`/pipeline?vagaId=${vaga.id}`)} style={{ cursor: 'pointer' }}>
                                        <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>
                                            {vaga.title}
                                        </span>
                                        {(vaga.is_third_party || !vaga.show_company_name || (vaga.is_pcd && vaga.is_pcd !== 'no')) && (
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
                                                {vaga.is_third_party && (
                                                    <span style={{ fontSize: '9px', color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                                        RPO: {vaga.company_name || 'Não definido'}
                                                    </span>
                                                )}
                                                {!vaga.show_company_name && (
                                                    <span style={{ fontSize: '9px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                        <Eye size={10} /> Confidencial
                                                    </span>
                                                )}
                                                {vaga.is_pcd && vaga.is_pcd !== 'no' && (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 6px', background: vaga.is_pcd === 'exclusive' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(59, 130, 246, 0.15)', borderRadius: '10px', color: vaga.is_pcd === 'exclusive' ? '#ec4899' : '#3b82f6', fontSize: '10px', fontWeight: 700 }}>
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                                            <circle cx="10" cy="4" r="2.5" />
                                                            <path d="M10 6.5 L10 11 L13 11" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                                                            <path d="M10 8 L13 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                                            <circle cx="12" cy="14" r="5" stroke="currentColor" strokeWidth="2" fill="none" />
                                                            <path d="M8 11 L14 11" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                                        </svg>
                                                        {vaga.is_pcd === 'exclusive' ? 'Exclusiva' : 'Inclusiva'}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                        <span>📍 {vaga.location || '-'}</span>
                                        <span>•</span>
                                        <span>{getContractTypeLabel(vaga.contract_type)}</span>
                                        <span>•</span>
                                        <span>{new Date(vaga.created_at).toLocaleDateString('pt-BR')}</span>
                                        <span>•</span>
                                        <span style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`/vagas/${vaga.id}/candidatos`)}>
                                            {vaga.application_count} candidaturas
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                                        <button onClick={() => copyPublicLink(vaga.public_hash)} title="Copiar link" style={{ minWidth: 44, minHeight: 44, background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ExternalLink size={16} />
                                        </button>
                                        <button onClick={() => window.open(getPublicJobUrl(vaga.public_hash, true), '_blank')} title="Visualizar" style={{ minWidth: 44, minHeight: 44, background: 'transparent', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Eye size={16} />
                                        </button>
                                        <button onClick={() => navigate(`/vagas/${vaga.id}/candidatos`)} title="Candidatos" style={{ minWidth: 44, minHeight: 44, background: 'transparent', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Users size={16} />
                                        </button>
                                        {userRole !== 'convidado' && (<>
                                            <button onClick={() => navigate(`/vagas/editar/${vaga.id}`)} title="Editar" style={{ minWidth: 44, minHeight: 44, background: 'transparent', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', color: '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => openDeleteModal(vaga.id)} title="Excluir" style={{ minWidth: 44, minHeight: 44, background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </>)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <>
                        {/* Table Header */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '80px 150px 2fr 1.2fr 0.8fr 0.6fr 0.8fr 0.6fr 160px',
                            padding: '16px 24px',
                            borderBottom: '1px solid var(--border)',
                            color: 'var(--text-muted)',
                            fontSize: '12px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            <div>Código</div>
                            <div style={{ textAlign: 'center' }}>Status</div>
                            <div>Título</div>
                            <div>Localização</div>
                            <div style={{ textAlign: 'center' }}>Criada em</div>
                            <div style={{ textAlign: 'center' }}>Tipo</div>
                            <div style={{ textAlign: 'center' }}>Candidaturas</div>
                            <div style={{ textAlign: 'center' }}>Link</div>
                            <div style={{ textAlign: 'center' }}>Ações</div>
                        </div>

                        {/* Table Rows */}
                        {paginatedVagas.map((vaga) => {
                            const currentStatus = getStatusFromVaga(vaga);
                            const statusConfig = getStatusConfig(currentStatus);
                            const isStatusOpen = openStatusId === vaga.id;

                            return (
                                <div
                                    key={vaga.id}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '80px 150px 2fr 1.2fr 0.8fr 0.6fr 0.8fr 0.6fr 160px',
                                        padding: '12px 24px',
                                        borderBottom: '1px solid var(--border)',
                                        alignItems: 'center',
                                        minHeight: '80px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '13px' }}>
                                        {vaga.job_code || '-'}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                        {userRole === 'convidado' ? (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                padding: '4px 10px', background: statusConfig.bg,
                                                border: `1px solid ${statusConfig.color}33`,
                                                borderRadius: '12px', color: statusConfig.color,
                                                fontSize: '12px', fontWeight: 600
                                            }}>
                                                {statusConfig.label}
                                            </span>
                                        ) : (
                                        <button
                                            ref={(el) => { statusBtnRefs.current[vaga.id] = el; }}
                                            onClick={() => {
                                                if (isStatusOpen) { setOpenStatusId(null); setDropdownPos(null); }
                                                else {
                                                    const btn = statusBtnRefs.current[vaga.id];
                                                    if (btn) {
                                                        const rect = btn.getBoundingClientRect();
                                                        const STATUS_ITEMS = 5, ITEM_HEIGHT = 42, DROPDOWN_PAD = 12;
                                                        const estimatedHeight = DROPDOWN_PAD + STATUS_ITEMS * ITEM_HEIGHT;
                                                        const spaceBelow = window.innerHeight - rect.bottom;
                                                        const spaceAbove = rect.top;
                                                        const openUpward = spaceBelow < estimatedHeight + 20 && spaceAbove >= estimatedHeight;
                                                        setDropdownPos({ top: openUpward ? rect.top - 8 : rect.bottom + 8, left: rect.left + rect.width / 2, openUpward });
                                                    }
                                                    setOpenStatusId(vaga.id);
                                                }
                                            }}
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                padding: '6px 12px', background: statusConfig.bg,
                                                border: `1px solid ${statusConfig.color}33`,
                                                borderRadius: '12px', color: statusConfig.color,
                                                cursor: 'pointer', fontSize: '12px', fontWeight: 600
                                            }}
                                        >
                                            {statusConfig.label}
                                            <ChevronDown size={12} style={{ transition: 'transform 0.2s', transform: isStatusOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                                        </button>
                                        )}
                                    </div>

                                    <div
                                        onClick={() => navigate(`/pipeline?vagaId=${vaga.id}`)}
                                        style={{ cursor: 'pointer', minWidth: 0 }}
                                    >
                                        <span style={{
                                            fontWeight: 700, fontSize: '15px', color: 'var(--text-main)',
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            transition: 'color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-main)'}
                                        >
                                            {vaga.title}
                                        </span>
                                        {(vaga.is_third_party || !vaga.show_company_name || (vaga.is_pcd && vaga.is_pcd !== 'no')) && (
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                {vaga.is_third_party && (
                                                    <span style={{ fontSize: '9px', color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                                        RPO: {vaga.company_name || 'Não definido'}
                                                    </span>
                                                )}
                                                {!vaga.show_company_name && (
                                                    <span style={{ fontSize: '9px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                        <Eye size={10} /> Confidencial
                                                    </span>
                                                )}
                                                {vaga.is_pcd && vaga.is_pcd !== 'no' && (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 6px', background: vaga.is_pcd === 'exclusive' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(59, 130, 246, 0.15)', borderRadius: '10px', color: vaga.is_pcd === 'exclusive' ? '#ec4899' : '#3b82f6', fontSize: '10px', fontWeight: 700 }}>
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                                            <circle cx="10" cy="4" r="2.5" />
                                                            <path d="M10 6.5 L10 11 L13 11" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                                                            <path d="M10 8 L13 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                                            <circle cx="12" cy="14" r="5" stroke="currentColor" strokeWidth="2" fill="none" />
                                                            <path d="M8 11 L14 11" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                                            <path d="M8 11 L8 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                                            <path d="M14 11 L16 13 L15 14" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                        {vaga.is_pcd === 'exclusive' ? 'Exclusiva' : 'Inclusiva'}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ color: 'var(--text-muted)', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {vaga.location || '-'}
                                    </div>

                                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
                                        {new Date(vaga.created_at).toLocaleDateString('pt-BR')}
                                    </div>

                                    <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
                                        {getContractTypeLabel(vaga.contract_type)}
                                    </div>

                                    <div onClick={() => navigate(`/vagas/${vaga.id}/candidatos`)} style={{ color: 'var(--primary)', fontSize: '14px', textAlign: 'center', cursor: 'pointer', fontWeight: 600 }}>
                                        {vaga.application_count}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <button onClick={() => copyPublicLink(vaga.public_hash)} title="Copiar link público" style={{ padding: '6px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ExternalLink size={14} />
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                                        <button onClick={() => window.open(getPublicJobUrl(vaga.public_hash, true), '_blank')} title="Visualizar vaga" style={{ padding: '6px', background: 'transparent', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Eye size={14} />
                                        </button>
                                        <button onClick={() => navigate(`/vagas/${vaga.id}/candidatos`)} title="Ver candidatos" style={{ padding: '6px', background: 'transparent', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Users size={14} />
                                        </button>
                                        {userRole !== 'convidado' && (<>
                                        <button onClick={() => navigate(`/vagas/editar/${vaga.id}`)} title="Editar" style={{ padding: '6px', background: 'transparent', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', color: '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Edit size={14} />
                                        </button>
                                        <button onClick={() => openDeleteModal(vaga.id)} title="Excluir" style={{ padding: '6px', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Trash2 size={14} />
                                        </button>
                                        </>)}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}

                {/* Paginação UI */}
                {!loading && filteredVagas.length > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: isMobile ? 'stretch' : 'center',
                        justifyContent: 'space-between',
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: isMobile ? '12px' : '0',
                        padding: isMobile ? '16px' : '16px 24px',
                        borderTop: '1px solid var(--border)',
                        background: 'rgba(0,0,0,0.02)',
                        color: 'var(--text-muted)',
                        fontSize: '13px'
                    }}>
                        <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
                            Mostrando <strong>{Math.min(filteredVagas.length, (currentPage - 1) * itemsPerPage + 1)}</strong>-
                            <strong>{Math.min(filteredVagas.length, currentPage * itemsPerPage)}</strong> de <strong>{filteredVagas.length}</strong> vagas
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                style={{
                                    padding: isMobile ? '10px 16px' : '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-card)',
                                    color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-main)',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    opacity: currentPage === 1 ? 0.5 : 1,
                                    minHeight: isMobile ? '44px' : 'auto',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Anterior
                            </button>

                            {[...Array(totalPages)].map((_, i) => {
                                const page = i + 1;
                                if (totalPages > 7) {
                                    if (page !== 1 && page !== totalPages && (page < currentPage - 1 || page > currentPage + 1)) {
                                        if (page === currentPage - 2 || page === currentPage + 2) return <span key={page}>...</span>;
                                        return null;
                                    }
                                }
                                
                                return (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        style={{
                                            width: isMobile ? '36px' : '32px',
                                            height: isMobile ? '36px' : '32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '6px',
                                            border: '1px solid',
                                            borderColor: currentPage === page ? 'var(--primary)' : 'var(--border)',
                                            background: currentPage === page ? 'var(--primary)' : 'var(--bg-card)',
                                            color: currentPage === page ? '#fff' : 'var(--text-main)',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {page}
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                style={{
                                    padding: isMobile ? '10px 16px' : '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-card)',
                                    color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-main)',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    opacity: currentPage === totalPages ? 0.5 : 1,
                                    minHeight: isMobile ? '44px' : 'auto',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Próximo
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Global Status Dropdown — position:fixed escapes overflow:hidden */}
            {openStatusId && dropdownPos && (() => {
                const vaga = vagas.find(v => v.id === openStatusId);
                if (!vaga) return null;
                const currentStatus = getStatusFromVaga(vaga);
                return (
                    <>
                        <div
                            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                            onClick={() => { setOpenStatusId(null); setDropdownPos(null); }}
                        />
                        <div style={{
                            position: 'fixed',
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            transform: `translateX(-50%) ${dropdownPos.openUpward ? 'translateY(-100%)' : ''}`,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            padding: '6px',
                            zIndex: 50,
                            minWidth: '140px',
                            boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.5)'
                        }}>
                            {(['aberta', 'fechada', 'pausada', 'cancelada', 'invisivel'] as VagaStatus[]).map((status) => {
                                const config = getStatusConfig(status);
                                return (
                                    <button
                                        key={status}
                                        onClick={() => updateVagaStatus(vaga.id, status)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            width: '100%',
                                            padding: '8px 12px',
                                            background: currentStatus === status ? config.bg : 'transparent',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: config.color,
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = config.bg}
                                        onMouseLeave={(e) => {
                                            if (currentStatus !== status) e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: config.color }} />
                                        {config.label}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                );
            })()}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: isMobile ? '20px' : '32px',
                        maxWidth: '420px',
                        width: isMobile ? '92%' : '90%',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        {/* Close Button */}
                        <button
                            onClick={cancelDelete}
                            style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={20} />
                        </button>

                        {/* Icon */}
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px'
                        }}>
                            <AlertTriangle size={28} style={{ color: '#ef4444' }} />
                        </div>

                        {/* Title */}
                        <h3 style={{
                            color: 'var(--text-main)',
                            fontSize: '20px',
                            fontWeight: 700,
                            textAlign: 'center',
                            margin: '0 0 8px'
                        }}>
                            Desativar Vaga?
                        </h3>

                        {/* Description */}
                        <p style={{
                            color: 'var(--text-muted)',
                            fontSize: '14px',
                            textAlign: 'center',
                            lineHeight: 1.6,
                            margin: '0 0 24px'
                        }}>
                            Tem certeza? Esta ação <strong>não pode ser desfeita</strong>. A vaga, candidaturas e pipeline associado serão excluídos permanentemente.
                        </p>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={cancelDelete}
                                disabled={deleting}
                                style={{
                                    flex: 1,
                                    padding: '12px 20px',
                                    background: 'transparent',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    color: 'var(--text-main)',
                                    cursor: deleting ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    transition: 'all 0.2s',
                                    opacity: deleting ? 0.5 : 1
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                style={{
                                    flex: 1,
                                    padding: '12px 20px',
                                    background: deleting ? '#991b1b' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: '#fff',
                                    cursor: deleting ? 'not-allowed' : 'pointer',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    transition: 'all 0.2s',
                                    opacity: deleting ? 0.5 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6
                                }}
                            >
                                {deleting ? 'Excluindo...' : 'Sim, Excluir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
            {/* Pipeline Delete Confirmation Modal */}
            {pipelineDeleteModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 200,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '24px',
                        padding: isMobile ? '24px' : '40px',
                        maxWidth: '480px',
                        width: isMobile ? '92%' : '90%',
                        textAlign: 'center',
                        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Decorative background element */}
                        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '120%', height: '40%', background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.08) 0%, transparent 100%)', zIndex: 0 }} />
                        
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '24px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 24px',
                                border: '1px solid rgba(239, 68, 68, 0.2)'
                            }}>
                                <AlertTriangle size={40} style={{ color: '#ef4444' }} />
                            </div>

                            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px', letterSpacing: '-0.02em' }}>
                                Excluir Pipeline de Candidatos?
                            </h2>
                            
                            <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
                                Ao fechar esta vaga, você pode optar por excluir o Pipeline Kanban associado.
                                <br />
                                <strong style={{ color: '#ef4444', display: 'block', marginTop: '12px' }}>
                                    ⚠️ Esta ação é irreversível e removerá todas as etapas e o histórico deste Kanban.
                                </strong>
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button
                                    onClick={confirmPipelineDelete}
                                    disabled={deletingPipeline}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        background: '#ef4444',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: '#fff',
                                        cursor: deletingPipeline ? 'not-allowed' : 'pointer',
                                        fontSize: '16px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 8px 20px rgba(239, 68, 68, 0.2)'
                                    }}
                                >
                                    {deletingPipeline ? 'Excluindo...' : 'Sim, Excluir Pipeline'}
                                </button>
                                
                                <button
                                    onClick={cancelPipelineDelete}
                                    disabled={deletingPipeline}
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
                                    Não, manter histórico do Pipeline
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Thank You Email Modal */}
            {closeEmailVaga && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: isMobile ? 24 : 40, maxWidth: 480, width: isMobile ? '95%' : '90%', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
                        {closeEmailVagaType === 'cancelada' ? (
                            <>
                                <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(245,158,11,0.2)' }}>
                                    <AlertTriangle size={40} color="#f59e0b" />
                                </div>
                                <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', marginBottom: 12, textAlign: 'center' }}>Notificar candidatos?</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
                                    Esta vaga foi cancelada. Os candidatos serão notificados por e-mail.
                                </p>
                                {closeEmailBreakdown && (
                                    <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 24 }}>
                                        {[...closeEmailBreakdown.approved, ...closeEmailBreakdown.rejected, ...closeEmailBreakdown.others].map(c => (
                                            <div key={c.email} style={{ padding: '8px 14px', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                                                {c.name} <span style={{ color: 'var(--text-dim)' }}>{c.email}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(99,102,241,0.2)' }}>
                                    <Mail size={40} color="var(--primary)" />
                                </div>
                                <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', marginBottom: 12, textAlign: 'center' }}>Enviar e-mails para os candidatos?</h2>

                        {closeEmailBreakdown && (
                            <div style={{ marginBottom: 24 }}>
                                {/* Aprovados */}
                                {closeEmailBreakdown.approved.length > 0 && (
                                    <div style={{ marginBottom: 8, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                                        <div onClick={() => setOpenSections(s => ({ ...s, approved: !s.approved }))}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', cursor: 'pointer', userSelect: 'none', background: 'var(--bg-main)' }}>
                                            <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: openSections.approved ? 'rotate(0deg)' : 'rotate(-90deg)', color: 'var(--text-dim)', flexShrink: 0 }} />
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', flex: 1 }}>
                                                Aprovados: ({closeEmailBreakdown.approved.length}) receberão <strong>parabéns</strong>
                                            </span>
                                        </div>
                                        {openSections.approved && (
                                            <div style={{ maxHeight: 150, overflowY: 'auto', borderTop: '1px solid var(--border)', padding: '6px 0' }}>
                                                {closeEmailBreakdown.approved.map(c => (
                                                    <div key={c.email} style={{ padding: '6px 14px', fontSize: 13, color: 'var(--text-main)' }}>
                                                        {c.name} <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{c.email}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Rejeitados */}
                                {closeEmailBreakdown.rejected.length > 0 && (
                                    <div style={{ marginBottom: 8, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                                        <div onClick={() => setOpenSections(s => ({ ...s, rejected: !s.rejected }))}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', cursor: 'pointer', userSelect: 'none', background: 'var(--bg-main)' }}>
                                            <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: openSections.rejected ? 'rotate(0deg)' : 'rotate(-90deg)', color: 'var(--text-dim)', flexShrink: 0 }} />
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', flex: 1 }}>
                                                Reprovados ({closeEmailBreakdown.rejected.length}) — não foram ao banco de talentos
                                            </span>
                                        </div>
                                        {openSections.rejected && (
                                            <div style={{ maxHeight: 150, overflowY: 'auto', borderTop: '1px solid var(--border)', padding: '6px 0' }}>
                                                {closeEmailBreakdown.rejected.map(c => (
                                                    <div key={c.email} style={{ padding: '6px 14px', fontSize: 13, color: 'var(--text-main)' }}>
                                                        {c.name} <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{c.email}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Outros (fora do banco de talentos) */}
                                {closeEmailBreakdown.others.length > 0 && (
                                    <div style={{ marginBottom: 8, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                                        <div onClick={() => setOpenSections(s => ({ ...s, others: !s.others }))}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', cursor: 'pointer', userSelect: 'none', background: 'var(--bg-main)' }}>
                                            <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: openSections.others ? 'rotate(0deg)' : 'rotate(-90deg)', color: 'var(--text-dim)', flexShrink: 0 }} />
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', flex: 1 }}>
                                                No banco de talentos ({closeEmailBreakdown.others.length}) — receberão <strong>agradecimento</strong>
                                            </span>
                                        </div>
                                        {openSections.others && (
                                            <div style={{ maxHeight: 150, overflowY: 'auto', borderTop: '1px solid var(--border)', padding: '6px 0' }}>
                                                {closeEmailBreakdown.others.map(c => (
                                                    <div key={c.email} style={{ padding: '6px 14px', fontSize: 13, color: 'var(--text-main)' }}>
                                                        {c.name} <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{c.email}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        </>)}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <button
                                onClick={() => {
                                    if (sendingCloseEmails) return;
                                    sendCloseEmails(closeEmailVaga.id, closeEmailVagaType ?? 'fechada');
                                }}
                                disabled={sendingCloseEmails}
                                style={{
                                    width: '100%', padding: 16,
                                    background: sendingCloseEmails ? '#6366f1' : 'var(--primary)',
                                    border: 'none', borderRadius: 12, color: '#fff',
                                    cursor: sendingCloseEmails ? 'not-allowed' : 'pointer',
                                    fontSize: 16, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                    opacity: sendingCloseEmails ? 0.7 : 1
                                }}
                            >
                                {sendingCloseEmails ? 'Enviando...' : `Sim, enviar para ${closeEmailVagaCount ?? '...'} candidato${closeEmailVagaCount !== 1 ? 's' : ''}`}
                            </button>
                            <button
                                onClick={() => { const pendingId = pendingPipelineDeleteFor; setCloseEmailVaga(null); setCloseEmailVagaCount(null); setCloseEmailBreakdown(null); setCloseEmailVagaType(null); setPendingPipelineDeleteFor(null); if (pendingId) { setVagaForPipelineDelete(pendingId); setPipelineDeleteModalOpen(true); } }}
                                disabled={sendingCloseEmails}
                                style={{
                                    width: '100%', padding: 16,
                                    background: 'transparent', border: '1px solid var(--border)', borderRadius: 12,
                                    color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15, fontWeight: 600,
                                    opacity: sendingCloseEmails ? 0.5 : 1
                                }}
                            >
                                Não
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showReopenEmailModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: isMobile ? 24 : 40, maxWidth: 480, width: isMobile ? '95%' : '90%', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(34,197,94,0.2)' }}>
                                <RefreshCw size={40} color="#22c55e" />
                            </div>
                            <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: 'var(--text-main)', marginBottom: 12 }}>Notificar candidatos?</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                                A vaga foi reaberta. Deseja notificar os candidatos?
                            </p>
                        </div>

                        <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 24 }}>
                            {reopenCandidates.map(c => (
                                <div key={c.email} style={{ padding: '8px 14px', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                                    {c.name} <span style={{ color: 'var(--text-dim)' }}>{c.email}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <button
                                onClick={() => sendReopenedEmails()}
                                disabled={sendingCloseEmails}
                                style={{
                                    width: '100%', padding: 16,
                                    background: 'var(--primary)', border: 'none', borderRadius: 12,
                                    color: '#fff', cursor: sendingCloseEmails ? 'not-allowed' : 'pointer',
                                    fontSize: 16, fontWeight: 700,
                                    opacity: sendingCloseEmails ? 0.7 : 1
                                }}
                            >
                                {sendingCloseEmails ? 'Enviando...' : `Sim, notificar ${reopenCandidates.length} candidato${reopenCandidates.length !== 1 ? 's' : ''}`}
                            </button>
                            <button
                                onClick={() => {
                                    if (reopenEmailVagaId) {
                                        setVagas(prev => prev.map(v =>
                                            v.id === reopenEmailVagaId ? { ...v, status: 'aberta' as const, is_accepting_applications: true } : v
                                        ));
                                        toast.success('Status alterado para "Aberta"');
                                    }
                                    setOpenStatusId(null);
                                    setShowReopenEmailModal(false);
                                    setReopenCandidates([]);
                                    setReopenEmailVagaId(null);
                                }}
                                disabled={sendingCloseEmails}
                                style={{
                                    width: '100%', padding: 16,
                                    background: 'transparent', border: '1px solid var(--border)', borderRadius: 12,
                                    color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15, fontWeight: 600
                                }}
                            >
                                Não
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
