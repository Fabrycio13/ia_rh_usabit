import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Mail, MessageCircle, Search, HelpCircle, BookOpen, Lightbulb, AlertTriangle, Zap, Users, Briefcase, LayoutGrid, FileText, Database, Star, CheckCircle2, ArrowRight } from 'lucide-react';

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
.faq-section { transition: all 0.2s; }
.contact-card:hover { border-color: var(--primary) !important; transform: translateY(-2px); }
.contact-card { transition: all 0.2s; }
.wpp-btn:hover { background: #16a34a !important; }
.email-btn:hover { background: #4f46e5 !important; }
.module-card { transition: all 0.2s; cursor: pointer; }
.module-card:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(99,102,241,0.15); border-color: var(--primary) !important; }
.tip-card { background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(59, 130, 246, 0.05)); border-left: 3px solid var(--success); }
.warning-card { background: linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(239, 68, 68, 0.05)); border-left: 3px solid #f59e0b; }
.step-item { position: relative; padding-left: 32px; }
.step-item::before { content: attr(data-step); position: absolute; left: 0; top: 0; width: 24px; height: 24px; background: var(--primary); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
.slide-down { animation: slideDown 0.3s ease-out; }
`;

// ─── FAQ DATA ─────────────────────────────────────────────────────────────────
const faqs = [
    {
        category: '🚀 Primeiros Passos',
        items: [
            {
                q: 'Como funciona a plataforma?',
                a: 'Nossa plataforma usa IA para analisar currículos automaticamente. Você cria vagas, faz upload de currículos e nossa IA extrai informações, avalia competências e gera scores para cada candidato. Tudo é organizado em dashboards intuitivos.',
            },
            {
                q: 'Por onde devo começar?',
                a: '1️⃣ Crie sua primeira vaga na seção "Vagas"\n2️⃣ Vá para "Análises" e faça upload dos currículos\n3️⃣ Acompanhe os resultados no Dashboard\n\nDica: Comece com 2-3 currículos para entender o fluxo completo.',
            },
            {
                q: 'Quanto tempo leva para analisar um currículo?',
                a: 'Em média, cada currículo leva de 30 segundos a 2 minutos para ser processado pela IA. O tempo pode variar dependendo do tamanho do arquivo e da complexidade das informações.',
            },
            {
                q: 'Quantos currículos posso analisar no plano Trial?',
                a: 'No plano Trial (7 dias gratuitos) você pode realizar até 5 análises de vagas. Para análises ilimitadas, faça upgrade para o plano Pro.',
            },
        ],
    },
    {
        category: '📋 Vagas',
        items: [
            {
                q: 'Como criar uma nova vaga?',
                a: '1. Acesse "Vagas" no menu lateral\n2. Clique no botão "+ Nova Vaga"\n3. Preencha as 3 etapas:\n   • Informações Básicas (título, descrição)\n   • Detalhes (salário, contrato, localização)\n   • Conteúdo (responsabilidades, requisitos)\n4. Clique em "Publicar Vaga"\n\n💡 Dica: Quanto mais detalhada a vaga, melhor a IA avaliará os candidatos.',
            },
            {
                q: 'O que significa cada status de vaga?',
                a: '🟢 Aberta: Aceitando candidaturas ativamente\n🔴 Fechada: Não aceita novas candidaturas, mas permanece visível\n🟡 Pausada: Temporariamente suspensa\n⚫ Cancelada: Vaga arquivada permanentemente\n\n💡 Dica: Você pode reabrir vagas fechadas ou pausadas a qualquer momento.',
            },
            {
                q: 'Como compartilhar o link da vaga?',
                a: 'Na listagem de vagas, clique no ícone de link (🔗) ao lado da vaga. O link público será copiado automaticamente para sua área de transferência. Candidatos podem acessar esse link para se inscrever.',
            },
            {
                q: 'Posso editar uma vaga já publicada?',
                a: 'Sim! Clique no ícone de lápis (✏️) ao lado da vaga. Você pode alterar todas as informações, exceto o ID público da vaga (o link permanece o mesmo).',
            },
            {
                q: 'Como funcionam os filtros avançados?',
                a: 'Na página de vagas, você pode filtrar por:\n• 🔍 Texto: busca no título, localização e tipo\n• 🏢 Organização: (apenas para owners)\n• 💼 Cargo: filtra por título específico\n• 📊 Status: Aberta, Fechada, Pausada, Cancelada\n• 📅 Período: intervalo de datas de criação\n\n💡 Dica: Combine múltiplos filtros para encontrar vagas específicas rapidamente.',
            },
        ],
    },
    {
        category: '🤖 Análises de Candidatos',
        items: [
            {
                q: 'Como analisar currículos com IA?',
                a: '1. Acesse "Análises" no menu\n2. Clique em "Nova Análise"\n3. Selecione ou crie uma vaga\n4. Faça upload dos currículos (PDF recomendado)\n5. Aguarde o processamento da IA\n6. Veja os resultados organizados por score\n\n📌 Formatos aceitos: PDF, DOC, DOCX\n💡 Dica: PDFs têm melhor taxa de extração de dados.',
            },
            {
                q: 'O que significa o score do candidato?',
                a: 'O score vai de 0 a 100 e reflete a adequação do candidato à vaga:\n\n🟢 70-100: Excelente compatibilidade (aprovado)\n🟡 40-69: Compatibilidade moderada (analisar)\n🔴 0-39: Baixa compatibilidade (não recomendado)\n\nA IA avalia: experiência, habilidades, formação e requisitos da vaga.',
            },
            {
                q: 'Como interpretar os resultados da análise?',
                a: 'Cada candidato terá:\n• 📊 Score geral (0-100)\n• 💼 Experiência extraída\n• 🎓 Formação acadêmica\n• 🛠️ Habilidades identificadas\n• ⚠️ Pontos de atenção (red flags)\n\n💡 Dica: Clique no nome do candidato para ver detalhes completos e conversar via chat.',
            },
            {
                q: 'Posso reanalisar um currículo?',
                a: 'Sim! Na página de detalhes do candidato, você pode solicitar uma nova análise. Isso é útil se a vaga foi atualizada ou se houve erro na extração inicial.',
            },
            {
                q: 'O que são as abas "Melhores", "Intermediários" e "Piores"?',
                a: 'São filtros automáticos baseados no score:\n• 🟢 Melhores (70+): Candidatos aprovados\n• 🟡 Intermediários (40-69): Precisam de análise manual\n• 🔴 Piores (0-39): Baixa compatibilidade\n\n💡 Dica: Foque nos "Melhores" primeiro, mas não ignore os "Intermediários" — muitos têm potencial!',
            },
        ],
    },
    {
        category: '📊 Dashboard',
        items: [
            {
                q: 'O que mostra o Dashboard?',
                a: 'O Dashboard é sua central de métricas:\n\n📈 KPIs principais:\n• Vagas Analisadas\n• Candidatos Avaliados\n• Melhores Candidatos\n• Taxa de Aprovação\n\n📊 Gráficos:\n• Evolução de candidatos por vaga\n• Calendário de atividades\n• Ranking de vagas mais populares\n\n💡 Dica: Use o botão "Customizar" para rearranjar os widgets.',
            },
            {
                q: 'Como filtrar dados por período?',
                a: 'No Dashboard, clique em dias no calendário para selecionar um intervalo:\n1. Clique no dia inicial\n2. Clique no dia final\n3. Os gráficos atualizarão automaticamente\n\n💡 Dica: Clique duas vezes no mesmo dia para ver apenas aquela data.',
            },
            {
                q: 'O que significa "Tempo Real" no header?',
                a: 'Indica que os dados são atualizados automaticamente conforme novas candidaturas e análises acontecem. Não precisa recarregar a página!',
            },
        ],
    },
    {
        category: '👥 Banco de Candidatos',
        items: [
            {
                q: 'Como acesso o Banco de Candidatos?',
                a: 'Clique em "Banco de Candidatos" no menu lateral. Todos os candidatos analisados ficam armazenados lá para consulta futura.\n\nVocê pode filtrar por:\n• Nome ou email\n• Cargo/vaga aplicada\n• Pontuação (score)\n• Data da análise\n• Status (ativo/bloqueado)',
            },
            {
                q: 'Como bloquear um candidato?',
                a: 'No banco de candidatos, clique no ícone de bloqueio (🚫) ao lado do candidato. Isso é útil para candidatos que não atendem aos requisitos ou foram desclassificados.\n\n⚠️ Candidatos bloqueados aparecem com indicador vermelho nas análises.',
            },
            {
                q: 'Posso exportar a lista de candidatos?',
                a: 'Sim! No topo da página do Banco de Candidatos, clique em "Exportar" para gerar um arquivo CSV com todos os dados dos candidatos filtrados.',
            },
        ],
    },
    {
        category: '⚙️ Conta e configurações',
        items: [
            {
                q: 'Como altero minha foto de perfil?',
                a: 'Clique no seu avatar (canto inferior esquerdo) → "Configurações" → clique na foto atual → selecione a nova imagem.\n\n📌 Formatos aceitos: JPG, PNG, WEBP\n📏 Tamanho máximo: 5MB',
            },
            {
                q: 'Posso mudar meu e-mail de acesso?',
                a: 'No momento o e-mail de acesso não pode ser alterado diretamente na plataforma. Entre em contato com o suporte para solicitar a troca.',
            },
            {
                q: 'Como altero minha senha?',
                a: 'Acesse "Configurações" → "Segurança" → "Alterar Senha". Você precisará informar a senha atual e a nova senha.',
            },
        ],
    },
    {
        category: '💳 Planos e pagamentos',
        items: [
            {
                q: 'Quais são os planos disponíveis?',
                a: '🆓 Trial: 7 dias grátis, 5 análises\n⭐ Pro: R$ 99,90/mês - análises ilimitadas\n🏢 Enterprise: Sob consulta - múltiplos usuários, API dedicada, suporte premium\n\n💡 Dica: O plano Enterprise inclui treinamento da equipe e integração com sistemas de RH.',
            },
            {
                q: 'Como faço upgrade do meu plano?',
                a: 'Acesse "Configurações" → "Plano Atual" → "Fazer Upgrade". Você será redirecionado para o checkout seguro.\n\n✅ Upgrade é imediato\n✅ Você mantém todos os dados\n✅ Cobre apenas a diferença proporcional',
            },
            {
                q: 'Meu pagamento é seguro?',
                a: 'Sim! Utilizamos:\n🔒 Criptografia SSL/TLS\n🔒 Processadores certificados PCI DSS\n🔒 Dados financeiros nunca armazenados\n\nSeu pagamento é processado por gateways líderes de mercado.',
            },
            {
                q: 'Como cancelar minha assinatura?',
                a: 'Acesse "Configurações" → "Plano Atual" → "Gerenciar Assinatura" → "Cancelar".\n\n✅ Cancelamento imediato\n✅ Acesso até o fim do período pago\n✅ Sem cobrança adicional\n✅ Dados mantidos por 30 dias',
            },
        ],
    },
    {
        category: '🔧 Problemas comuns',
        items: [
            {
                q: 'A análise está demorando muito, o que faço?',
                a: 'Se uma análise levar mais de 5 minutos:\n1. Verifique sua conexão com a internet\n2. Tente recarregar a página\n3. Se o problema persistir, entre em contato com o suporte\n\n⚠️ Não faça upload do mesmo arquivo múltiplas vezes.',
            },
            {
                q: 'O PDF do currículo não está sendo lido corretamente',
                a: 'Dicas para melhor extração:\n✅ Use PDFs de texto (não imagens escaneadas)\n✅ Evite PDFs com layouts muito complexos\n✅ Formatos .doc/.docx também funcionam bem\n\nSe o problema persistir, tente copiar o texto do currículo e colar no campo de texto manual.',
            },
            {
                q: 'Não vejo minhas vagas/candidatos',
                a: 'Possíveis causas:\n1. Verifique se está na organização correta (filtro no topo)\n2. Confirme se você tem permissão para ver esses dados\n3. Tente limpar os filtros aplicados\n\nSe o problema persistir, contate o suporte com prints da tela.',
            },
            {
                q: 'Erro ao fazer upload de arquivo',
                a: 'Verifique:\n📏 Tamanho máximo: 10MB por arquivo\n📄 Formatos aceitos: PDF, DOC, DOCX\n📁 Nome do arquivo: evite caracteres especiais\n\nSe ainda assim não funcionar, tente outro navegador ou contate o suporte.',
            },
        ],
    },
];

// ─── QUICK TIPS DATA ──────────────────────────────────────────────────────────
const quickTips = [
    { icon: '📄', tip: 'Use PDFs de texto para melhor extração de dados', color: '#10b981' },
    { icon: '🎯', tip: 'Vagas detalhadas geram análises mais precisas', color: '#3b82f6' },
    { icon: '⚡', tip: 'Combine filtros para encontrar dados rapidamente', color: '#8b5cf6' },
    { icon: '📊', tip: 'Monitore o Dashboard para métricas em tempo real', color: '#f59e0b' },
];

// ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────────────────
const shortcuts = [
    { keys: 'Ctrl + K', action: 'Busca rápida' },
    { keys: 'Ctrl + N', action: 'Nova vaga/análise' },
    { keys: 'Esc', action: 'Fechar modais' },
    { keys: '← →', action: 'Navegar entre páginas' },
];

// ─── FAQ COMPONENT ────────────────────────────────────────────────────────────
const FaqItem = ({ q, a }: { q: string; a: string }) => {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ borderBottom: '1px solid var(--border)', overflow: 'hidden', transition: 'all 0.2s' }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '12px' }}
            >
                <span style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 500, flex: 1 }}>{q}</span>
                {open
                    ? <ChevronUp style={{ width: 16, height: 16, color: 'var(--primary)', flexShrink: 0 }} />
                    : <ChevronDown style={{ width: 16, height: 16, color: 'var(--text-dim)', flexShrink: 0 }} />}
            </button>
            {open && (
                <div className="slide-down" style={{ padding: '0 0 16px' }}>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: '1.7', margin: 0, whiteSpace: 'pre-line' }}>{a}</p>
                </div>
            )}
        </div>
    );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export const Ajuda = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'faq' | 'guide' | 'troubleshoot'>('faq');

    const filtered = faqs.map(cat => ({
        ...cat,
        items: cat.items.filter(
            item =>
                item.q.toLowerCase().includes(search.toLowerCase()) ||
                item.a.toLowerCase().includes(search.toLowerCase())
        ),
    })).filter(cat => cat.items.length > 0);

    const whatsappNumber = '5521999999999';
    const whatsappMsg = encodeURIComponent('Olá! Preciso de ajuda com a plataforma.');

    return (
        <>
            <style>{css}</style>

            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                    <HelpCircle size={32} style={{ color: 'var(--primary)' }} />
                    <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                        Central de Ajuda
                    </h1>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                    Encontre respostas, guias e dicas para usar a plataforma ao máximo
                </p>
            </div>

            {/* Quick Tips Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {quickTips.map((t, i) => (
                    <div key={i} className="tip-card" style={{ borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>{t.icon}</span>
                        <span style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: 500, lineHeight: 1.3 }}>{t.tip}</span>
                    </div>
                ))}
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '6px', width: 'fit-content' }}>
                {[
                    { key: 'faq' as const, label: 'Perguntas Frequentes', icon: HelpCircle },
                    { key: 'guide' as const, label: 'Guia por Módulo', icon: BookOpen },
                    { key: 'troubleshoot' as const, label: 'Solução de Problemas', icon: AlertTriangle },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: activeTab === tab.key ? 'var(--primary)' : 'transparent',
                            color: activeTab === tab.key ? '#fff' : 'var(--text-dim)'
                        }}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>

                {/* LEFT COLUMN - Main Content */}
                <div>
                    {/* TAB: FAQ */}
                    {activeTab === 'faq' && (
                        <>
                            {/* Search */}
                            <div style={{ position: 'relative', marginBottom: '24px' }}>
                                <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-dim)', pointerEvents: 'none' }} />
                                <input
                                    placeholder="Buscar dúvidas... (ex: como criar vaga, score, etc)"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px 12px 42px', color: 'var(--text-main)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                                    onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                                />
                            </div>

                            {filtered.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-dim)' }}>
                                    <Search size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                                    <p style={{ fontSize: '15px', marginBottom: '8px' }}>Nenhuma dúvida encontrada para "<strong style={{ color: 'var(--text-main)' }}>{search}</strong>"</p>
                                    <p style={{ fontSize: '13px' }}>Tente outros termos ou fale com nosso suporte</p>
                                </div>
                            ) : (
                                filtered.map(cat => (
                                    <div key={cat.category} className="faq-section" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '4px 24px', marginBottom: '16px' }}>
                                        <p style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '18px 0 12px' }}>{cat.category}</p>
                                        {cat.items.map(item => <FaqItem key={item.q} q={item.q} a={item.a} />)}
                                        <div style={{ height: '4px' }} />
                                    </div>
                                ))
                            )}
                        </>
                    )}

                    {/* TAB: GUIDE */}
                    {activeTab === 'guide' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Module Cards */}
                            {[
                                {
                                    icon: Briefcase,
                                    title: 'Vagas',
                                    desc: 'Crie e gerencie vagas para candidatos',
                                    color: '#3b82f6',
                                    steps: [
                                        'Acesse "Vagas" no menu lateral',
                                        'Clique em "+ Nova Vaga"',
                                        'Preencha as 3 etapas do formulário',
                                        'Publique e compartilhe o link',
                                    ],
                                    tip: 'Vagas detalhadas = Análises mais precisas',
                                    link: '/vagas',
                                },
                                {
                                    icon: FileText,
                                    title: 'Análises',
                                    desc: 'Analise currículos com IA',
                                    color: '#8b5cf6',
                                    steps: [
                                        'Acesse "Análises" no menu',
                                        'Crie uma análise ou selecione existente',
                                        'Faça upload dos currículos (PDF)',
                                        'Aguarde o processamento da IA',
                                        'Revise os scores e detalhes',
                                    ],
                                    tip: 'PDFs de texto têm melhor extração que imagens',
                                    link: '/analises',
                                },
                                {
                                    icon: LayoutGrid,
                                    title: 'Dashboard',
                                    desc: 'Acompanhe métricas e resultados',
                                    color: '#10b981',
                                    steps: [
                                        'Acesse o Dashboard',
                                        'Veja KPIs no topo',
                                        'Use o calendário para filtrar por período',
                                        'Customize a posição dos widgets',
                                    ],
                                    tip: 'Clique em "Customizar" para rearranjar os gráficos',
                                    link: '/dashboard',
                                },
                                {
                                    icon: Users,
                                    title: 'Banco de Candidatos',
                                    desc: 'Gerencie todos os candidatos analisados',
                                    color: '#f59e0b',
                                    steps: [
                                        'Acesse "Banco de Candidatos"',
                                        'Use filtros para encontrar candidatos',
                                        'Clique para ver detalhes completos',
                                        'Exporte dados ou bloqueie candidatos',
                                    ],
                                    tip: 'Candidatos bloqueados aparecem com 🚫 nas análises',
                                    link: '/candidatos',
                                },
                                {
                                    icon: Database,
                                    title: 'Administração',
                                    desc: 'Gerencie usuários e logs (Admins)',
                                    color: '#ef4444',
                                    steps: [
                                        'Acesse "Painel Admin" (apenas admins)',
                                        'Gerencie status de usuários',
                                        'Monitore atividades nos Logs',
                                        'Filtre por organização e período',
                                    ],
                                    tip: 'Use logs para auditoria e troubleshooting',
                                    link: '/admin',
                                },
                            ].map((module, i) => (
                                <div key={i} className="module-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                                            <div style={{
                                                width: '44px', height: '44px', borderRadius: '12px',
                                                background: `${module.color}15`, display: 'flex',
                                                alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <module.icon size={22} style={{ color: module.color }} />
                                            </div>
                                            <div>
                                                <h3 style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: 700, margin: 0 }}>{module.title}</h3>
                                                <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '2px 0 0' }}>{module.desc}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate(module.link)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                padding: '8px 14px', borderRadius: '8px',
                                                background: `${module.color}15`, border: `1px solid ${module.color}30`,
                                                color: module.color, fontSize: '12px', fontWeight: 600,
                                                cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = `${module.color}25`}
                                            onMouseLeave={e => e.currentTarget.style.background = `${module.color}15`}
                                        >
                                            Abrir <ArrowRight size={12} />
                                        </button>
                                    </div>

                                    {/* Steps */}
                                    <div style={{ marginBottom: '14px' }}>
                                        <p style={{ color: 'var(--text-dim)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Passo a Passo</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {module.steps.map((step, idx) => (
                                                <div key={idx} className="step-item" data-step={idx + 1} style={{ color: 'var(--text-main)', fontSize: '13px', lineHeight: 1.5 }}>
                                                    {step}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Tip */}
                                    <div className="tip-card" style={{ borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Lightbulb size={14} style={{ color: module.color, flexShrink: 0 }} />
                                        <span style={{ color: 'var(--text-main)', fontSize: '12px', fontWeight: 500 }}>Dica: {module.tip}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* TAB: TROUBLESHOOT */}
                    {activeTab === 'troubleshoot' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {[
                                {
                                    problem: 'Análise demorando muito (>5 min)',
                                    icon: '⏱️',
                                    causes: [
                                        'Conexão lenta ou instável',
                                        'Arquivo muito grande (>10MB)',
                                        'Servidor sobrecarregado (raro)',
                                    ],
                                    solutions: [
                                        'Verifique sua internet',
                                        'Recarregue a página (F5)',
                                        'Tente com arquivo menor',
                                        'Se persistir, contate o suporte',
                                    ],
                                },
                                {
                                    problem: 'PDF não está sendo lido corretamente',
                                    icon: '📄',
                                    causes: [
                                        'PDF é imagem escaneada (sem texto)',
                                        'Layout muito complexo com colunas',
                                        'Arquivo corrompido',
                                    ],
                                    solutions: [
                                        'Use PDFs de texto (não escaneados)',
                                        'Tente formato .doc ou .docx',
                                        'Copie e cole o texto manualmente',
                                        'Simplifique o layout do currículo',
                                    ],
                                },
                                {
                                    problem: 'Não consigo ver minhas vagas/candidatos',
                                    icon: '👁️',
                                    causes: [
                                        'Filtros ativos escondendo dados',
                                        'Organização errada selecionada',
                                        'Permissões insuficientes',
                                    ],
                                    solutions: [
                                        'Clique em "Limpar Filtros"',
                                        'Verifique a organização no topo',
                                        'Confirme suas permissões com o admin',
                                        'Tente acessar via link direto',
                                    ],
                                },
                                {
                                    problem: 'Erro ao fazer upload de arquivo',
                                    icon: '⚠️',
                                    causes: [
                                        'Arquivo maior que 10MB',
                                        'Formato não suportado',
                                        'Nome com caracteres especiais',
                                    ],
                                    solutions: [
                                        'Comprima o arquivo (máx: 10MB)',
                                        'Use PDF, DOC ou DOCX',
                                        'Renomeie sem caracteres especiais',
                                        'Tente outro navegador',
                                    ],
                                },
                                {
                                    problem: 'Score do candidato parece incorreto',
                                    icon: '📊',
                                    causes: [
                                        'Vaga com requisitos muito específicos',
                                        'Currículo com informações incompletas',
                                        'IA não conseguiu extrair dados importantes',
                                    ],
                                    solutions: [
                                        'Revise os requisitos da vaga',
                                        'Solicite nova análise do candidato',
                                        'Verifique os dados extraídos manualmente',
                                        'Contate o suporte se necessário',
                                    ],
                                },
                            ].map((item, i) => (
                                <div key={i} className="warning-card" style={{ borderRadius: '16px', padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                        <span style={{ fontSize: '24px' }}>{item.icon}</span>
                                        <h3 style={{ color: 'var(--text-main)', fontSize: '16px', fontWeight: 700, margin: 0 }}>{item.problem}</h3>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        {/* Causes */}
                                        <div>
                                            <p style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                                🔍 Possíveis Causas
                                            </p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {item.causes.map((cause, idx) => (
                                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '13px' }}>
                                                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                                                        {cause}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Solutions */}
                                        <div>
                                            <p style={{ color: 'var(--success)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                                ✅ Soluções
                                            </p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {item.solutions.map((sol, idx) => (
                                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '13px' }}>
                                                        <CheckCircle2 size={12} style={{ color: 'var(--success)', flexShrink: 0 }} />
                                                        {sol}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN - Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Quick Links */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px' }}>
                        <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '14px', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Zap size={16} style={{ color: '#f59e0b' }} /> Acesso Rápido
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                                { label: 'Criar Nova Vaga', link: '/vagas/nova', color: '#3b82f6' },
                                { label: 'Nova Análise', link: '/analise/nova', color: '#8b5cf6' },
                                { label: 'Dashboard', link: '/dashboard', color: '#10b981' },
                                { label: 'Banco de Candidatos', link: '/candidatos', color: '#f59e0b' },
                            ].map(link => (
                                <button
                                    key={link.link}
                                    onClick={() => navigate(link.link)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px 14px', borderRadius: '8px',
                                        background: `${link.color}10`, border: `1px solid ${link.color}20`,
                                        color: link.color, fontSize: '13px', fontWeight: 600,
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = `${link.color}20`;
                                        e.currentTarget.style.transform = 'translateX(4px)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = `${link.color}10`;
                                        e.currentTarget.style.transform = 'translateX(0)';
                                    }}
                                >
                                    {link.label}
                                    <ArrowRight size={12} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Keyboard Shortcuts */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px' }}>
                        <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '14px', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Star size={16} style={{ color: '#f59e0b' }} /> Atalhos do Teclado
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {shortcuts.map(s => (
                                <div key={s.keys} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>{s.action}</span>
                                    <kbd style={{
                                        padding: '4px 8px', borderRadius: '6px',
                                        background: 'var(--bg-main)', border: '1px solid var(--border)',
                                        color: 'var(--text-main)', fontSize: '11px', fontWeight: 700,
                                        fontFamily: 'monospace'
                                    }}>{s.keys}</kbd>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Contact */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px' }}>
                        <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '14px', margin: '0 0 4px' }}>Não encontrou sua resposta?</p>
                        <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '0 0 18px', lineHeight: '1.5' }}>Nossa equipe está pronta para te ajudar.</p>

                        {/* WhatsApp */}
                        <a
                            href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
                            target="_blank"
                            rel="noreferrer"
                            className="wpp-btn"
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px', borderRadius: '10px', background: '#15803d', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box', marginBottom: '10px', transition: 'background 0.15s' }}
                        >
                            <MessageCircle style={{ width: 16, height: 16 }} />
                            Falar no WhatsApp
                        </a>

                        {/* E-mail */}
                        <a
                            href="mailto:suporte@usabit.com.br"
                            className="email-btn"
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px', borderRadius: '10px', background: '#6366f1', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box', marginBottom: '12px', transition: 'background 0.15s' }}
                        >
                            <Mail style={{ width: 16, height: 16 }} />
                            Enviar e-mail
                        </a>

                        <p style={{ color: 'var(--text-dim)', fontSize: '11px', textAlign: 'center', margin: '14px 0 0' }}>
                            📞 (21) 99999-9999<br />
                            <span style={{ color: 'var(--text-muted)' }}>Seg–Sex, 9h–18h</span>
                        </p>
                    </div>

                    {/* Status */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 22px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px var(--success)' }} />
                            <p style={{ color: 'var(--success)', fontSize: '13px', fontWeight: 600, margin: 0 }}>Todos os sistemas operacionais</p>
                        </div>
                        <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: 0 }}>Uptime: 99.9% nos últimos 30 dias</p>
                    </div>
                </div>
            </div>
        </>
    );
};

