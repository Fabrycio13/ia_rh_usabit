import { useState } from 'react';
import { ChevronDown, ChevronUp, Mail, MessageCircle, Search, LifeBuoy } from 'lucide-react';

const faqs = [
    {
        category: 'Uso da plataforma',
        items: [
            {
                q: 'Como faço para analisar um currículo?',
                a: 'Acesse a seção "Análises" no menu lateral e clique em "Nova Análise". Faça o upload do currículo em PDF e aguarde o processamento — nossa IA irá extrair e avaliar as informações automaticamente.',
            },
            {
                q: 'Quantos currículos posso analisar no plano Trial?',
                a: 'No plano Trial (7 dias gratuitos) você pode realizar até 5 análises. Para análises ilimitadas, faça upgrade para o plano Pro.',
            },
            {
                q: 'Como acesso o Banco de Candidatos?',
                a: 'Clique em "Banco de Candidatos" no menu lateral. Todos os candidatos analisados ficam armazenados lá para consulta futura, podendo ser filtrados por cargo, empresa, data e pontuação.',
            },
            {
                q: 'Posso exportar os resultados das análises?',
                a: 'Sim! Em cada análise você encontra o botão de exportação que gera um relatório em PDF com todas as informações extraídas e a avaliação da IA.',
            },
        ],
    },
    {
        category: 'Conta e perfil',
        items: [
            {
                q: 'Como altero minha foto de perfil?',
                a: 'Acesse "Configurações" pelo menu do usuário (canto inferior esquerdo da tela) e clique na foto ou em "Trocar foto". Formatos aceitos: JPG, PNG e WEBP.',
            },
            {
                q: 'Posso mudar meu e-mail de acesso?',
                a: 'No momento o e-mail de acesso não pode ser alterado diretamente na plataforma. Entre em contato com o suporte para solicitar a troca.',
            },
            {
                q: 'Como cancelar minha assinatura?',
                a: 'Acesse "Configurações" e vá até a seção "Plano Atual". Clique em "Gerenciar assinatura" e siga as instruções. Você pode cancelar a qualquer momento sem cobrança adicional.',
            },
        ],
    },
    {
        category: 'Planos e pagamentos',
        items: [
            {
                q: 'Quais são os planos disponíveis?',
                a: 'Oferecemos 3 planos: Trial (7 dias grátis), Pro (R$ 99,90/mês com análises ilimitadas) e Enterprise (sob consulta, com múltiplos usuários e suporte dedicado).',
            },
            {
                q: 'Como faço upgrade do meu plano?',
                a: 'Acesse "Configurações" → "Plano Atual" e clique em "Fazer upgrade". Você será redirecionado para a página de pagamento segura.',
            },
            {
                q: 'Meu pagamento é seguro?',
                a: 'Sim. Utilizamos criptografia SSL e processadores de pagamento certificados PCI DSS. Seus dados financeiros nunca são armazenados em nossos servidores.',
            },
        ],
    },
];

const FaqItem = ({ q, a }: { q: string; a: string }) => {
    const [open, setOpen] = useState(false);
    return (
        <div
            style={{ borderBottom: '1px solid #1F2332', overflow: 'hidden', transition: 'all 0.2s' }}
        >
            <button
                onClick={() => setOpen(o => !o)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '12px' }}
            >
                <span style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 500 }}>{q}</span>
                {open
                    ? <ChevronUp style={{ width: 16, height: 16, color: '#6366f1', flexShrink: 0 }} />
                    : <ChevronDown style={{ width: 16, height: 16, color: '#4a5568', flexShrink: 0 }} />}
            </button>
            {open && (
                <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.65', margin: '0 0 16px', paddingRight: '24px' }}>{a}</p>
            )}
        </div>
    );
};

export const Ajuda = () => {
    const [search, setSearch] = useState('');

    const filtered = faqs.map(cat => ({
        ...cat,
        items: cat.items.filter(
            item =>
                item.q.toLowerCase().includes(search.toLowerCase()) ||
                item.a.toLowerCase().includes(search.toLowerCase())
        ),
    })).filter(cat => cat.items.length > 0);

    const whatsappNumber = '5521999999999';
    const whatsappMsg = encodeURIComponent('Olá! Preciso de ajuda com a plataforma Analista de Currículos.');

    return (
        <>
            <style>{`
                .faq-section { transition: all 0.2s; }
                .contact-card:hover { border-color: #6366f1 !important; transform: translateY(-2px); }
                .contact-card { transition: all 0.2s; }
                .wpp-btn:hover { background: #16a34a !important; }
                .email-btn:hover { background: #4f46e5 !important; }
            `}</style>

            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#6366f115', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <LifeBuoy style={{ width: 18, height: 18, color: '#6366f1' }} />
                    </div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Central de Ajuda</h1>
                </div>
                <p style={{ color: '#4a5568', fontSize: '14px', margin: '0 0 0 48px' }}>Encontre respostas rápidas ou fale com nosso suporte</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px', alignItems: 'start' }}>

                {/* FAQ */}
                <div>
                    {/* Busca */}
                    <div style={{ position: 'relative', marginBottom: '24px' }}>
                        <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#4a5568', pointerEvents: 'none' }} />
                        <input
                            placeholder="Buscar dúvidas..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ width: '100%', background: '#0B0D12', border: '1px solid #1F2332', borderRadius: '10px', padding: '11px 14px 11px 42px', color: '#f1f5f9', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                            onFocus={e => (e.target.style.borderColor = '#6366f1')}
                            onBlur={e => (e.target.style.borderColor = '#1F2332')}
                        />
                    </div>

                    {filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#4a5568' }}>
                            <p style={{ fontSize: '14px', margin: 0 }}>Nenhuma dúvida encontrada para "<strong style={{ color: '#64748b' }}>{search}</strong>"</p>
                        </div>
                    ) : (
                        filtered.map(cat => (
                            <div key={cat.category} className="faq-section" style={{ background: '#0B0D12', border: '1px solid #1F2332', borderRadius: '14px', padding: '4px 24px', marginBottom: '16px' }}>
                                <p style={{ color: '#6366f1', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '18px 0 4px' }}>{cat.category}</p>
                                {cat.items.map(item => <FaqItem key={item.q} q={item.q} a={item.a} />)}
                                <div style={{ height: '4px' }} />
                            </div>
                        ))
                    )}
                </div>

                {/* Contato */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ background: '#0B0D12', border: '1px solid #1F2332', borderRadius: '14px', padding: '22px' }}>
                        <p style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '14px', margin: '0 0 4px' }}>Não encontrou sua resposta?</p>
                        <p style={{ color: '#4a5568', fontSize: '13px', margin: '0 0 18px', lineHeight: '1.5' }}>Nossa equipe está pronta para te ajudar.</p>

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
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px', borderRadius: '10px', background: '#6366f1', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box', transition: 'background 0.15s' }}
                        >
                            <Mail style={{ width: 16, height: 16 }} />
                            Enviar e-mail
                        </a>

                        <p style={{ color: '#4a5568', fontSize: '11px', textAlign: 'center', margin: '14px 0 0' }}>
                            📞 (21) 99999-9999<br />
                            <span style={{ color: '#374151' }}>Seg–Sex, 9h–18h</span>
                        </p>
                    </div>

                    {/* Status */}
                    <div style={{ background: '#0B0D12', border: '1px solid #1F2332', borderRadius: '14px', padding: '18px 22px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                            <p style={{ color: '#10b981', fontSize: '13px', fontWeight: 600, margin: 0 }}>Todos os sistemas operacionais</p>
                        </div>
                        <p style={{ color: '#4a5568', fontSize: '12px', margin: 0 }}>Uptime: 99.9% nos últimos 30 dias</p>
                    </div>
                </div>
            </div>
        </>
    );
};
