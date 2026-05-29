import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Mail, MessageCircle, Search, HelpCircle, BookOpen, Lightbulb, AlertTriangle, Zap, Users, Briefcase, LayoutGrid, FileText, Database, Star, CheckCircle2, ArrowRight, Key, Layout } from 'lucide-react';

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
                a: 'O sistema de IA RH funciona com o seguinte fluxo:\n\n1. 📋 **Criar Vaga**: Defina requisitos e publique no portal de carreiras.\n2. 📥 **Receber Candidatos**: Via portal público ou adicao manual no Pool de Talentos.\n3. 🤖 **Analise de IA**: O sistema avalia cada candidato e calcula a compatibilidade (match).\n4. ⚡ **Banco de Talentos**: Candidatos analisados ficam armazenados para consultas futuras.\n5. 📊 **Pipeline**: Gerencie o funil de contratação de forma visual.\n\n💡 Dica: Use o Pool de Talentos para candidatos espontâneos e o Banco de Talentos para candidatos já analisados.',
            },
            {
                q: 'Por onde devo começar? (Passo a Passo)',
                a: '1️⃣ **Crie sua Vaga**: Vá em "Vagas" > "+ Nova Vaga" e preencha os 4 passos.\n2️⃣ **Publique a Vaga**: Após criar, a vaga estará disponível no portal de carreiras.\n3️⃣ **Receba Candidatos**: Eles aparecem automaticamente no Pool de Talentos.\n4️⃣ **Analise os Candidatos**: No Pool, selecione uma vaga e clique em "Analisar Candidato".\n5️⃣ **Mova para o Banco**: Após análise, o candidato vai para o Banco de Talentos.\n6️⃣ **Use o Pipeline**: Envie candidatos do Banco para o Pipeline e gerencie o funil.',
            },
            {
                q: 'Qual a diferença entre Pool de Talentos e Banco de Talentos?',
                a: '**Pool de Talentos**: Área de espera para candidatos novos ou manuais que ainda não foram analisados. Aqui você analisa o candidato para uma vaga específica.\n\n**Banco de Talentos**: Área onde candidatos já analisados ficam armazenados. Você pode reanalisar para novas vagas, ver histórico ou enviar para o Pipeline.\n\nResumo: Pool = entrada de candidatos novos. Banco = candidatos prontos para uso.',
            },
            {
                q: 'Quanto tempo leva para analisar um currículo?',
                a: 'Em média, cada análise leva de 30 segundos a 2 minutos para ser processada pela IA. O tempo pode variar dependendo do tamanho do arquivo e da complexidade das informações.',
            },
        ],
    },
    {
        category: '📋 Vagas',
        items: [
            {
                q: 'Como criar uma nova vaga?',
                a: '1. Acesse "Vagas" no menu lateral\n2. Clique no botão "+ Nova Vaga"\n3. Preencha as 4 etapas:\n   • Informações Básicas (título, descrição)\n   • Detalhes (salário, contrato, localização, regime)\n   • Conteúdo (atribuições, requisitos, diferenciais)\n   • Configurações Avançadas (terceiros, perguntas, design, pipeline)\n4. Clique em "Salvar Vaga"\n\n💡 Dica: Quanto mais detalhada a vaga, melhor a IA avaliará os candidatos.',
            },
            {
                q: 'O que significa cada status de vaga?',
                a: '🟢 Aberta: Aceitando candidaturas ativamente\n🔴 Fechada: Não aceita novas candidaturas\n🟡 Pausada: Temporariamente suspensa\n⚫ Cancelada: Vaga arquivada permanentemente\n⬜ Invisível: Vaga existe mas não aparece no portal (rascunho)\n\n💡 Dica: Você pode reabrir vagas fechadas ou pausadas a qualquer momento.',
            },
            {
                q: 'Como compartilhar o link da vaga?',
                a: 'Na listagem de vagas, clique no ícone de link (🔗) ao lado da vaga. O link público será copiado automaticamente para sua área de transferência. Candidatos podem acessar esse link para se inscrever diretamente.',
            },
            {
                q: 'Posso editar uma vaga já publicada?',
                a: 'Sim! Clique no ícone de menu (3 pontinhos) ao lado da vaga e selecione "Editar". Você pode alterar todas as informações. O link público da vaga permanece o mesmo.',
            },
            {
                q: 'Como configurar um Pipeline para a vaga?',
                a: 'Na etapa 4 (Configurações Avançadas) do formulário de vaga, procure a opção "Pipeline de Recrutamento".\n\nLá você pode:\n• Vincular a vaga a um pipeline existente\n• Ou criar um novo pipeline específico para esta vaga\n\nIsso permite gerenciar os candidatos da vaga no quadro visual do Pipeline.',
            },
        ],
    },
    {
        category: '🧩 Pool de Talentos',
        items: [
            {
                q: 'O que é o Pool de Talentos?',
                a: 'O Pool de Talentos é uma área de espera onde candidatos ficam armazenados até que sejam analisados para uma vaga específica. Candidatos chegam ao Pool de duas formas:\n\n• **Candidatura Espontânea**: Quando alguém se candidata pelo portal de carreiras público.\n• **Adição Manual**: Quando você adiciona um candidato diretamente pelo botão "Adicionar Candidato".\n\nApós a análise, o candidato automaticamente vai para o Banco de Talentos.',
            },
            {
                q: 'Como adicionar um candidato manualmente ao Pool?',
                a: '1. Acesse "Vagas" > "Pool de Talentos"\n2. Clique no botão "+ Adicionar Candidato"\n3. Escolha entre:\n   • **Upload de Currículo**: Selecione o PDF do currículo e aguarde a extração de dados\n   • **Preencher Formulário**: Digite nome, email, telefone e localização\n4. Clique em "Confirmar"\n5. O candidato aparecerá no Pool aguardando análise',
            },
            {
                q: 'Como analisar um candidato do Pool?',
                a: '1. No Pool de Talentos, localize o candidato desejado\n2. Clique sobre o card do candidato para abrir os detalhes\n3. Selecione a vaga no dropdown "Selecione a Vaga"\n4. Clique em "Analisar Candidato"\n5. Aguarde o processamento (30s a 2min)\n6. O sistema exibirá:\n   • Porcentagem de Match (0-100%)\n   • Análise da Nota (feedback da IA)\n   • Formação (cursos e educação)\n   • Pontos Positivos\n   • Pontos de Atenção\n7. Automaticamente, o candidato será movido para o Banco de Talentos',
            },
            {
                q: 'O que é o campo "source" no Pool?',
                a: 'O campo "source" indica a origem do candidato no sistema:\n\n• **Espontâneo**: Candidato que veio pelo portal público de carreiras\n• **Manual**: Candidato adicionado manualmente pelo RH\n• **null/vazio**: Candidato que foi analisado e saiu do Pool\n\nEste campo ajuda a identificar de onde veio cada candidato.',
            },
        ],
    },
    {
        category: '👥 Banco de Talentos',
        items: [
            {
                q: 'Como acesso o Banco de Talentos?',
                a: 'Clique em "Candidatos" no menu lateral > "Banco de Talentos".\n\nTodos os candidatos já analisados ficam armazenados lá para consulta futura. Você pode filtrar por nome, email, vaga ou score.',
            },
            {
                q: 'Como funciona a reanálise de candidato?',
                a: 'A reanálise permite gerar uma nova análise do candidato para uma vaga diferente ou atualizar a análise existente.\n\n1. No Banco de Talentos, localize o candidato\n2. Clique para abrir os detalhes\n3. Clique no botão "Reanalisar Candidato" (seta circular)\n4. Selecione a nova vaga no dropdown\n5. Escolha se deseja criar novo pipeline ou usar existente\n6. Clique em "Iniciar Reanálise"\n7. Aguarde o processamento\n\n⚠️ Cada reanálise cria um novo registro no histórico. O histórico mantém todas as análises anteriores.',
            },
            {
                q: 'Como enviar um candidato para o Pipeline?',
                a: '1. No Banco de Talentos, localize o candidato\n2. Clique para abrir os detalhes\n3. Clique na aba "Vagas" (ícone de maleta)\n4. Ao lado da vaga desejada, clique em "Enviar para Pipeline"\n5. Selecione o pipeline de destino\n6. Escolha a coluna inicial (ex: Triagem)\n7. Clique em "Confirmar"\n\nO candidato aparecerá no Pipeline na coluna escolhida.',
            },
            {
                q: 'Como interpretar os dados do Banco de Talentos?',
                a: 'No Banco de Talentos você vê:\n\n• **Badge colorido de vagas**: Mostra até 3 vagas aplicadas ao candidato, cada cor representa uma vaga diferente\n• **Análise da Nota**: Feedback detalhado da IA sobre a compatibilidade\n• **Histórico**: Todas as análises feitas para o candidato (com job_id, job_name, score, data)\n\nA seção "Feedback da IA" mostra a análise mais recente. A aba "Vagas" mostra todas as inscrições.',
            },
            {
                q: 'O que significa "Vaga Desconhecida" no Banco?',
                a: 'Isso acontece quando há uma entrada de histórico sem o nome da vaga definido (job_name vazio). O sistema agora deduplica automaticamente quando há duplicidade.\n\nSe aparecer "Vaga Desconhecida", pode indicar que:\n• A análise foi feita sem vaga vinculada\n• Há uma entrada incompleta no histórico\n\nO sistema mantém sempre a entrada com mais conteúdo como principal.',
            },
        ],
    },
    {
        category: '📊 Pipeline',
        items: [
            {
                q: 'Como funciona o Pipeline?',
                a: 'O Pipeline é um quadro visual de gestão do processo seletivo em etapas (Kanban).\n\nCOLUNAS PADRÃO:\n• 🟣 Triagem: Candidatos novos recebidos\n• 🔵 Entrevista: Candidatos em entrevista\n• 🟠 Proposta: Candidatos com proposta emitida\n• 🟢 Aprovado: Candidatos aprovados\n• 🔴 Reprovado: Candidatos reprovados\n\nVocê pode criar colunas personalizadas também.',
            },
            {
                q: 'Como adicionar um candidato ao Pipeline?',
                a: 'MODO 1 - Do Banco de Talentos:\n1. Abra o candidato no Banco de Talentos\n2. Vá na aba "Vagas"\n3. Clique em "Enviar para Pipeline"\n\nMODO 2 - Direto no Pipeline:\n1. Acesse "Candidatos" > "Pipeline"\n2. Selecione o pipeline desejado\n3. Clique em "+ Adicionar Candidato"\n4. Selecione o candidato da lista\n5. (Opcional) Escolha vaga e score do match\n6. Selecione a coluna inicial\n7. Clique em "Adicionar"',
            },
            {
                q: 'Como mover candidatos entre colunas?',
                a: '1. No Pipeline, localize o candidato\n2. Clique e arraste o card do candidato para a coluna desejada\n3. Solte na posição escolhida\n\nO sistema registra automaticamente a movimentação. O histórico de movimentos pode ser visto no painel de detalhes do candidato.',
            },
            {
                q: 'O que aparece no card do Pipeline?',
                a: 'No card do Pipeline você vê:\n\n• **Nome do candidato**\n• **Score do match** (ex: 84% match)\n• **Vaga** (ex: Design VA-05)\n• **Data da análise**\n\nQuando você clica no card, abre um painel lateral com:\n• Todos os dados do candidato\n• Feedback da análise da IA\n• Histórico de análises e inscrições\n• Botões para ver vaga, mover, ou remover',
            },
            {
                q: 'Como remover um candidato do Pipeline?',
                a: '1. Clique no botão de menu (3 pontinhos) no card do candidato\n2. Selecione "Remover do Pipeline"\n3. Confirme a remoção\n\n⚠️ IMPORTANTE: Remover do Pipeline NÃO exclui o candidato do Banco de Talentos. O candidato continua existindo normalmente e pode ser enviado novamente mais tarde.',
            },
            {
                q: 'O que é o "firstJob" no Pipeline?',
                a: 'O "firstJob" é um mecanismo que exibe no painel lateral do candidato a vaga e score do card do Pipeline, mesmo quando não há histórico de análise.\n\nIsso garante que ao abrir um card do Pipeline, você sempre verá:\n• Nome da vaga (display_job_name)\n• Score do match\n• Data da análise\n\nMesmo que o candidato não tenha histórico completo no banco de dados.',
            },
        ],
    },
    {
        category: '🤖 Análises de IA',
        items: [
            {
                q: 'Como a IA analisa os candidatos?',
                a: 'A IA analisa o currículo comparando com os requisitos da vaga:\n\n1. **Experiência Profissional**: Tempo na área, relevância das empresas, nível hierárquico\n2. **Formação e Cursos**: Graduação, cursos técnicos, certificações\n3. **Habilidades Técnicas**: Ferramentas e tecnologias mencionadas\n4. **Pontos Positivos**: Diferenciais e experiências relevantes\n5. **Pontos de Atenção**: Gaps de qualificação, inconsistências, informações faltantes\n\nO resultado é um score de 0-100% que indica a compatibilidade.',
            },
            {
                q: 'Como interpretar o score de match?',
                a: 'O score vai de 0 a 100 e reflete a adequação do candidato à vaga:\n\n🟢 70-100: Excelente compatibilidade - candidate fortemente qualificado\n🟡 40-69: Compatibilidade moderada - requiere análise manual\n🔴 0-39: Baixa compatibilidade - avaliação cuidadosa necessária\n\n💡 Dica: Use o score como referência, não como veredicto definitivo. A avaliação humana é sempre essencial.',
            },
            {
                q: 'Como melhorar a precisão das análises?',
                a: 'Para análises mais precisas:\n\n1. **Vagas detalhadas**: Preencha todos os campos de requisitos, atribuições e diferenciais\n2. **Currículos em PDF de texto**: Evite imagens escaneadas\n3. **Informações completas**: Currículos com experiência e formação bem descritas geram melhores resultados\n4. **Reanálise quando necessário**: Se a vaga mudou ou o currículo está desatualizado, solicite nova análise',
            },
            {
                q: 'O que é o campo "summary" na análise?',
                a: 'O "summary" é o campo principal do feedback da IA - é a "Análise da Nota" que aparece no painel do candidato.\n\nEste campo é extraído e mapeado para a experiência do candidato no sistema. Ele contém o texto narrativo da avaliação da IA sobre a compatibilidade do candidato com a vaga.',
            },
        ],
    },
    {
        category: '🔧 Problemas Comuns',
        items: [
            {
                q: 'Análise está demorando muito, o que faço?',
                a: 'Se uma análise levar mais de 5 minutos:\n1. Verifique sua conexão com a internet\n2. Tente recarregar a página\n3. Se o problema persistir, entre em contato com o suporte\n\n⚠️ Não faça upload do mesmo arquivo múltiplas vezes.',
            },
            {
                q: 'O PDF do currículo não está sendo lido corretamente',
                a: 'Dicas para melhor extração:\n✅ Use PDFs de texto (não imagens escaneadas)\n✅ Evite PDFs com layouts muito complexos ou colunas\n✅ Formatos .doc/.docx também funcionam bem\n\nSe o problema persistir, tente:\n• Converter o PDF para formato diferente\n• Simplificar o layout do currículo\n• Copiar o texto e colar manualmente',
            },
            {
                q: 'Não vejo minhas vagas/candidatos',
                a: 'Possíveis causas:\n1. Verifique se está na organização correta (filtro no topo)\n2. Confirme se você tem permissão para ver esses dados\n3. Tente limpar os filtros aplicados\n4. Verifique se a vaga está com status correto (Aberta)\n\nSe o problema persistir, contate o suporte com prints da tela.',
            },
            {
                q: 'Erro ao fazer upload de arquivo',
                a: 'Verifique:\n📏 Tamanho máximo: 10MB por arquivo\n📄 Formatos aceitos: PDF, DOC, DOCX\n📁 Nome do arquivo: evite caracteres especiais (!, @, #, etc)\n\nSe ainda assim não funcionar, tente outro navegador ou contate o suporte.',
            },
            {
                q: 'Candidato duplicado no Banco de Talentos',
                a: 'Isso acontece quando há duas entradas de análise para a mesma vaga (ex: uma com job_name e outra sem).\n\nO sistema agora deduplica automaticamente:\n• Se dois entries têm o mesmo jobId, mantém o com mais conteúdo\n• "Vaga Desconhecida" é substituído pelo nome real quando disponível\n\nSe a duplicação persistir, entre em contato com o administrador.',
            },
        ],
    },
    {
        category: '⚙️ Conta e Configurações',
        items: [
            {
                q: 'Como altero minha foto de perfil?',
                a: 'Clique no seu avatar (canto inferior esquerdo) > "Configurações" > clique na foto atual > selecione a nova imagem.\n\n📌 Formatos aceitos: JPG, PNG, WEBP\n📏 Tamanho máximo: 5MB',
            },
            {
                q: 'Posso mudar meu e-mail de acesso?',
                a: 'No momento o e-mail de acesso não pode ser alterado diretamente na plataforma. Entre em contato com o suporte para solicitar a troca.',
            },
            {
                q: 'Como altero minha senha?',
                a: 'Acesse "Configurações" > "Segurança" > "Alterar Senha". Você precisará informar a senha atual e a nova senha.',
            },
            {
                q: 'Quais são os perfis de usuário?',
                a: 'O sistema possui os seguintes perfis:\n\n👑 **Owner/Administrador**: Acesso completo ao sistema\n👔 **RH Gestor**: Acesso a todas as vagas e candidatos da empresa\n👤 **RH Operador**: Acesso a vagas e candidatos específicos\n👁️ **Convidado**: Apenas visualização, não pode criar ou editar\n\nAs permissões são definidas pelo administrador em "Configurações" > "Equipe".',
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
                                {
                                    icon: Zap,
                                    title: 'Pipeline',
                                    desc: 'Gerencie o fluxo de contratação visualmente',
                                    color: '#f59e0b',
                                    steps: [
                                        'Acesse "Pipeline" no menu lateral',
                                        'Vincule uma vaga ao pipeline (opcional)',
                                        'Arraste candidatos entre as colunas de etapas',
                                        'Personalize as colunas conforme seu processo',
                                    ],
                                    tip: 'O Pipeline ajuda a não perder nenhum candidato de vista',
                                    link: '/pipeline',
                                },
                                {
                                    icon: Key,
                                    title: 'API e Integrações',
                                    desc: 'Conecte o sistema com suas ferramentas',
                                    color: '#3b82f6',
                                    steps: [
                                        'Acesse "Configurações" > "API"',
                                        'Gere sua Chave de API (Secret Key)',
                                        'Consulte a documentação técnica',
                                        'Realize os testes de integração',
                                    ],
                                    tip: 'A API é ideal para empresas com sistemas próprios de RH',
                                    link: '/configuracoes',
                                },
                                {
                                    icon: Layout,
                                    title: 'Página de Carreiras',
                                    desc: 'Personalize seu portal white label',
                                    color: '#ec4899',
                                    steps: [
                                        'Acesse "Configurações" > "Página de Carreiras"',
                                        'Configure sua logomarca e imagem de capa',
                                        'Defina a cor principal da sua marca',
                                        'Escreva sobre sua empresa',
                                    ],
                                    tip: 'Este é o link que você enviará para os candidatos',
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

