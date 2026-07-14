import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Mail, MessageCircle, Search, HelpCircle, BookOpen, Lightbulb, AlertTriangle, Zap, Users, Briefcase, LayoutGrid, FileText, Database, Star, CheckCircle2, ArrowRight, Key, Layout } from 'lucide-react';
import { useLang } from '../../core/contexts/LangContext';

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
@media (max-width: 768px) {
    .ajuda-root { overflow-x: hidden; max-width: 100%; padding: 0 4px; }
    .ajuda-grid-2col { grid-template-columns: 1fr !important; }
    .ajuda-quicktips { grid-template-columns: 1fr 1fr !important; }
    .ajuda-tabnav { width: 100% !important; }
    .ajuda-tabnav > * { flex: 1 1 0%; font-size: 11px !important; padding: 8px 8px !important; gap: 4px !important; }
    .ajuda-trouble-grid { grid-template-columns: 1fr !important; }
}
`;

// ─── FAQ ITEM HELPER ─────────────────────────────────────────────────────────
function faqItem(qKey: string, aKey: string) {
    return function(t: (k: string) => string) { return { q: t(qKey), a: t(aKey) }; };
} 

const faqDefs = [
    { categoryKey: 'faqCategoriaPrimeirosPassos', items: [
        faqItem('comoFunciona', 'comoFuncionaResp'),
        faqItem('porOndeComecar', 'passoAPasso'),
        faqItem('diferencaPoolBanco', ''),
        faqItem('tempoAnalise', 'tempoAnaliseResp'),
    ]},
    { categoryKey: 'faqCategoriaVagas', items: [
        faqItem('comoCriarVaga', ''),
        faqItem('statusSignificado', ''),
        faqItem('comoCompartilharLink', ''),
        faqItem('comoEditarVaga', ''),
        faqItem('comoConfigurarPipeline', ''),
    ]},
    { categoryKey: 'faqCategoriaPool', items: [
        faqItem('faqPoolOQue', 'faqPoolOQueResp'),
        faqItem('comoAdicionarPool', ''),
        faqItem('comoAnalisarPool', ''),
        faqItem('campoSource', ''),
    ]},
    { categoryKey: 'faqCategoriaBanco', items: [
        faqItem('faqBancoAcesso', 'faqBancoAcessoResp'),
        faqItem('faqBancoReanalise', 'faqBancoReanaliseResp'),
        faqItem('faqBancoEnviarPipeline', 'faqBancoEnviarPipelineResp'),
        faqItem('faqBancoInterpretar', 'faqBancoInterpretarResp'),
        faqItem('faqBancoVagaDesconhecida', 'faqBancoVagaDesconhecidaResp'),
    ]},
    { categoryKey: 'faqCategoriaPipeline', items: [
        faqItem('faqPipelineFunciona', 'faqPipelineFuncionaResp'),
        faqItem('faqPipelineAdicionar', 'faqPipelineAdicionarResp'),
        faqItem('faqPipelineMover', 'faqPipelineMoverResp'),
        faqItem('faqPipelineCard', 'faqPipelineCardResp'),
        faqItem('faqPipelineRemover', 'faqPipelineRemoverResp'),
        faqItem('faqPipelineFirstJob', 'faqPipelineFirstJobResp'),
    ]},
    { categoryKey: 'faqCategoriaAnalisesIA', items: [
        faqItem('faqIAComoAnalisa', 'faqIAComoAnalisaResp'),
        faqItem('faqIAInterpretarScore', 'faqIAInterpretarScoreResp'),
        faqItem('faqIAMelhorarPrecisao', 'faqIAMelhorarPrecisaoResp'),
        faqItem('faqIASummary', 'faqIASummaryResp'),
    ]},
    { categoryKey: 'faqCategoriaProblemasComuns', items: [
        faqItem('faqProblemasAnaliseDemorando', 'faqProblemasAnaliseDemorandoResp'),
        faqItem('faqProblemasPDFNaoLido', 'faqProblemasPDFNaoLidoResp'),
        faqItem('faqProblemasNaoVejo', 'faqProblemasNaoVejoResp'),
        faqItem('faqProblemasErroUpload', 'faqProblemasErroUploadResp'),
        faqItem('faqProblemasCandidatoDuplicado', 'faqProblemasCandidatoDuplicadoResp'),
    ]},
    { categoryKey: 'faqCategoriaContaConfig', items: [
        faqItem('faqContaAlterarFoto', 'faqContaAlterarFotoResp'),
        faqItem('faqContaMudarEmail', 'faqContaMudarEmailResp'),
        faqItem('faqContaAlterarSenha', 'faqContaAlterarSenhaResp'),
        faqItem('faqContaPerfisUsuario', 'faqContaPerfisUsuarioResp'),
    ]},
];

function buildFaqs(t: (k: string) => string) {
    return faqDefs.map(cat => ({
        category: t(cat.categoryKey),
        items: cat.items.map(fn => fn(t)).filter(item => item.a !== ''),
    }));
}

// ─── QUICK TIPS DATA ──────────────────────────────────────────────────────────
function getQuickTips(t: (k: string) => string) {
    return [
        { icon: '📄', tip: t('dicaPdfTexto'), color: '#10b981' },
        { icon: '🎯', tip: t('dicaVagasDetalhadas'), color: '#3b82f6' },
        { icon: '⚡', tip: t('dicaFiltros'), color: '#8b5cf6' },
        { icon: '📊', tip: t('dicaDashboard'), color: '#f59e0b' },
    ];
}

// ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────────────────
function getShortcuts(t: (k: string) => string) {
    return [
        { keys: 'Ctrl + K', action: t('atalhoBuscaRapida') },
        { keys: 'Ctrl + N', action: t('atalhoNovaVaga') },
        { keys: 'Esc', action: t('atalhoFecharModais') },
        { keys: '← →', action: t('atalhoNavegar') },
    ];
}

// ─── FAQ COMPONENT ────────────────────────────────────────────────────────────
const FaqItem = ({ q, a }: { q: string; a: string }) => {
    const [open, setOpen] = useState(false);
    const renderedA = a.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
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
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: '1.7', margin: 0, whiteSpace: 'pre-line' }} dangerouslySetInnerHTML={{ __html: renderedA }} />
                </div>
            )}
        </div>
    );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export const Ajuda = () => {
    const navigate = useNavigate();
    const { t } = useLang();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'faq' | 'guide' | 'troubleshoot'>('faq');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const mql = window.matchMedia('(max-width: 768px)');
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    const faqs = buildFaqs(t);
    const filtered = faqs.map(cat => ({
        ...cat,
        items: cat.items.filter(
            item =>
                item.q.toLowerCase().includes(search.toLowerCase()) ||
                item.a.toLowerCase().includes(search.toLowerCase())
        ),
    })).filter(cat => cat.items.length > 0);

    const whatsappNumber = '5521999999999';
    const whatsappMsg = encodeURIComponent(t('whatsappMsg'));

    return (
        <div className="ajuda-root">
            <style>{css}</style>

            {/* Header */}
            <div style={{ marginBottom: isMobile ? '20px' : '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '22px' : '16px', marginBottom: '8px' }}>
                    <HelpCircle size={isMobile ? 24 : 32} style={{ color: 'var(--primary)' }} />
                    <h1 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                        {t('centralAjuda')}
                    </h1>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                    {t('ajudaDesc')}
                </p>
            </div>

            {/* Quick Tips Bar */}
            <div className="ajuda-quicktips" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {getQuickTips(t).map((tip, i) => (
                    <div key={i} className="tip-card" style={{ borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>{tip.icon}</span>
                        <span style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: 500, lineHeight: 1.3 }}>{tip.tip}</span>
                    </div>
                ))}
            </div>

            {/* Tab Navigation */}
            <div className="ajuda-tabnav" style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '6px', width: isMobile ? '100%' : 'fit-content' }}>
                {[
                    { key: 'faq' as const, label: t('duvidasFrequentes'), icon: HelpCircle },
                    { key: 'guide' as const, label: t('tutorialRapido'), icon: BookOpen },
                    { key: 'troubleshoot' as const, label: t('solucaoProblemas'), icon: AlertTriangle },
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

            <div className="ajuda-grid-2col" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: '24px', alignItems: 'start' }}>

                {/* LEFT COLUMN - Main Content */}
                <div>
                    {/* TAB: FAQ */}
                    {activeTab === 'faq' && (
                        <>
                            {/* Search */}
                            <div style={{ position: 'relative', marginBottom: '24px' }}>
                                <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-dim)', pointerEvents: 'none' }} />
                                <input
                                    placeholder={t('buscaPlaceholder')}
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
                                    <p style={{ fontSize: '15px', marginBottom: '8px' }}>{t('nenhumaDuvidaEncontrada')} "<strong style={{ color: 'var(--text-main)' }}>{search}</strong>"</p>
                                    <p style={{ fontSize: '13px' }}>{t('tenteOutrosTermos')}</p>
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
                                    title: t('moduloVagas'),
                                    desc: t('modVagasDesc'),
                                    color: '#3b82f6',
                                    steps: [
                                        t('modVagasStep1'),
                                        t('modVagasStep2'),
                                        t('modVagasStep3'),
                                        t('modVagasStep4'),
                                    ],
                                    tip: t('modVagasTip'),
                                    link: '/vagas',
                                },
                                {
                                    icon: FileText,
                                    title: t('moduloAnalises'),
                                    desc: t('modAnalisesDesc'),
                                    color: '#8b5cf6',
                                    steps: [
                                        t('modAnalisesStep1'),
                                        t('modAnalisesStep2'),
                                        t('modAnalisesStep3'),
                                        t('modAnalisesStep4'),
                                        t('modAnalisesStep5'),
                                    ],
                                    tip: t('modAnalisesTip'),
                                    link: '/analises',
                                },
                                {
                                    icon: LayoutGrid,
                                    title: t('moduloDashboard'),
                                    desc: t('modDashboardDesc'),
                                    color: '#10b981',
                                    steps: [
                                        t('modDashboardStep1'),
                                        t('modDashboardStep2'),
                                        t('modDashboardStep3'),
                                        t('modDashboardStep4'),
                                    ],
                                    tip: t('modDashboardTip'),
                                    link: '/dashboard',
                                },
                                {
                                    icon: Users,
                                    title: t('bancoCandidatos'),
                                    desc: t('modBancoDesc'),
                                    color: '#f59e0b',
                                    steps: [
                                        t('modBancoStep1'),
                                        t('modBancoStep2'),
                                        t('modBancoStep3'),
                                        t('modBancoStep4'),
                                    ],
                                    tip: t('modBancoTip'),
                                    link: '/candidatos',
                                },
                                {
                                    icon: Database,
                                    title: t('modAdminTitle'),
                                    desc: t('modAdminDesc'),
                                    color: '#ef4444',
                                    steps: [
                                        t('modAdminStep1'),
                                        t('modAdminStep2'),
                                        t('modAdminStep3'),
                                        t('modAdminStep4'),
                                    ],
                                    tip: t('modAdminTip'),
                                    link: '/admin',
                                },
                                {
                                    icon: Zap,
                                    title: t('moduloPipeline'),
                                    desc: t('modPipelineDesc'),
                                    color: '#f59e0b',
                                    steps: [
                                        t('modPipelineStep1'),
                                        t('modPipelineStep2'),
                                        t('modPipelineStep3'),
                                        t('modPipelineStep4'),
                                    ],
                                    tip: t('modPipelineTip'),
                                    link: '/pipeline',
                                },
                                {
                                    icon: Key,
                                    title: t('modApiTitle'),
                                    desc: t('modApiDesc'),
                                    color: '#3b82f6',
                                    steps: [
                                        t('modApiStep1'),
                                        t('modApiStep2'),
                                        t('modApiStep3'),
                                        t('modApiStep4'),
                                    ],
                                    tip: t('modApiTip'),
                                    link: '/configuracoes',
                                },
                                {
                                    icon: Layout,
                                    title: t('modCarreirasTitle'),
                                    desc: t('modCarreirasDesc'),
                                    color: '#ec4899',
                                    steps: [
                                        t('modCarreirasStep1'),
                                        t('modCarreirasStep2'),
                                        t('modCarreirasStep3'),
                                        t('modCarreirasStep4'),
                                    ],
                                    tip: t('modCarreirasTip'),
                                    link: '/configuracoes',
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
                                            {t('guiaAbrir')} <ArrowRight size={12} />
                                        </button>
                                    </div>

                                    {/* Steps */}
                                    <div style={{ marginBottom: '14px' }}>
                                        <p style={{ color: 'var(--text-dim)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>{t('guiaPassoAPasso')}</p>
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
                                        <span style={{ color: 'var(--text-main)', fontSize: '12px', fontWeight: 500 }}>{t('guiaDica')}: {module.tip}</span>
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
                                    problem: t('troubleshootingAnaliseDemorando'),
                                    icon: '⏱️',
                                    causes: [
                                        t('troubleshootingCausaConexao'),
                                        t('troubleshootingCausaArquivoGrande'),
                                        t('troubleshootingCausaServidorSobrecarregado'),
                                    ],
                                    solutions: [
                                        t('troubleshootingSolucaoVerificarInternet'),
                                        t('troubleshootingSolucaoRecarregar'),
                                        t('troubleshootingSolucaoArquivoMenor'),
                                        t('troubleshootingSolucaoContatarSuporte'),
                                    ],
                                },
                                {
                                    problem: t('troubleshootingPDFNaoLido'),
                                    icon: '📄',
                                    causes: [
                                        t('troubleshootingCausaPDFImagem'),
                                        t('troubleshootingCausaLayoutComplexo'),
                                        t('troubleshootingCausaArquivoCorrompido'),
                                    ],
                                    solutions: [
                                        t('troubleshootingSolucaoTextoPDF'),
                                        t('troubleshootingSolucaoDocx'),
                                        t('troubleshootingSolucaoCopiarTexto'),
                                        t('troubleshootingSolucaoSimplificarLayout'),
                                    ],
                                },
                                {
                                    problem: t('troubleshootingNaoVejoVagas'),
                                    icon: '👁️',
                                    causes: [
                                        t('troubleshootingCausaFiltrosAtivos'),
                                        t('troubleshootingCausaOrganizacaoErrada'),
                                        t('troubleshootingCausaPermissoes'),
                                    ],
                                    solutions: [
                                        t('troubleshootingSolucaoLimparFiltros'),
                                        t('troubleshootingSolucaoVerificarOrg'),
                                        t('troubleshootingSolucaoConfirmarPermissoes'),
                                        t('troubleshootingSolucaoLinkDireto'),
                                    ],
                                },
                                {
                                    problem: t('troubleshootingErroUpload'),
                                    icon: '⚠️',
                                    causes: [
                                        t('troubleshootingCausaTamanho'),
                                        t('troubleshootingCausaFormato'),
                                        t('troubleshootingCausaCaracteres'),
                                    ],
                                    solutions: [
                                        t('troubleshootingSolucaoComprimir'),
                                        t('troubleshootingSolucaoFormatos'),
                                        t('troubleshootingSolucaoRenomear'),
                                        t('troubleshootingSolucaoOutroNavegador'),
                                    ],
                                },
                                {
                                    problem: t('troubleshootingScoreIncorreto'),
                                    icon: '📊',
                                    causes: [
                                        t('troubleshootingCausaRequisitosEspecificos'),
                                        t('troubleshootingCausaCurriculoIncompleto'),
                                        t('troubleshootingCausaExtracaoFalhou'),
                                    ],
                                    solutions: [
                                        t('troubleshootingSolucaoRevisarRequisitos'),
                                        t('troubleshootingSolucaoNovaAnalise'),
                                        t('troubleshootingSolucaoVerificarDados'),
                                        t('troubleshootingSolucaoSuporte'),
                                    ],
                                },
                            ].map((item, i) => (
                                <div key={i} className="warning-card" style={{ borderRadius: '16px', padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                        <span style={{ fontSize: '24px' }}>{item.icon}</span>
                                        <h3 style={{ color: 'var(--text-main)', fontSize: '16px', fontWeight: 700, margin: 0 }}>{item.problem}</h3>
                                    </div>

                                    <div className="ajuda-trouble-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                                        {/* Causes */}
                                        <div>
                                            <p style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                                🔍 {t('troubleshootingPossiveisCausas')}
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
                                                ✅ {t('troubleshootingSolucoes')}
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
                            <Zap size={16} style={{ color: '#f59e0b' }} /> {t('acessoRapido')}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                                { label: t('criarNovaVaga'), link: '/vagas/nova', color: '#3b82f6' },
                                { label: t('novaAnalise'), link: '/analise/nova', color: '#8b5cf6' },
                                { label: t('dashboard'), link: '/dashboard', color: '#10b981' },
                                { label: t('bancoCandidatos'), link: '/candidatos', color: '#f59e0b' },
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
                            <Star size={16} style={{ color: '#f59e0b' }} /> {t('atalhosTeclado')}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {getShortcuts(t).map(s => (
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
                        <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '14px', margin: '0 0 4px' }}>{t('naoEncontrouResposta')}</p>
                        <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '0 0 18px', lineHeight: '1.5' }}>{t('equipeProntaAjudar')}</p>

                        {/* WhatsApp */}
                        <a
                            href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
                            target="_blank"
                            rel="noreferrer"
                            className="wpp-btn"
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px', borderRadius: '10px', background: '#15803d', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box', marginBottom: '10px', transition: 'background 0.15s' }}
                        >
                            <MessageCircle style={{ width: 16, height: 16 }} />
                            {t('falarWhatsApp')}
                        </a>

                        {/* E-mail */}
                        <a
                            href="mailto:suporte@usabit.com.br"
                            className="email-btn"
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px', borderRadius: '10px', background: '#6366f1', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box', marginBottom: '12px', transition: 'background 0.15s' }}
                        >
                            <Mail style={{ width: 16, height: 16 }} />
                            {t('enviarEmail')}
                        </a>

                        <p style={{ color: 'var(--text-dim)', fontSize: '11px', textAlign: 'center', margin: '14px 0 0' }}>
                            📞 (21) 99999-9999<br />
                            <span style={{ color: 'var(--text-muted)' }}>{t('horarioAtendimento')}</span>
                        </p>
                    </div>

                    {/* Status */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 22px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px var(--success)' }} />
                            <p style={{ color: 'var(--success)', fontSize: '13px', fontWeight: 600, margin: 0 }}>{t('todosSistemasOperacionais')}</p>
                        </div>
                        <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: 0 }}>{t('uptime')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

