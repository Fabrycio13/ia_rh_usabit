import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Activity, Users, LogOut, Globe, HelpCircle, ChevronRight, Check, PanelLeft, Settings, MessageSquare, Zap, Bot, Kanban, ShieldCheck, Database, Briefcase } from 'lucide-react';
import { supabase } from '../core/services/supabase';
import { useUser } from '../core/contexts/UserContext';
import { useLang } from '../core/contexts/LangContext';
import { useAnalysis } from '../core/contexts/AnalysisContext';
import { hasPermission } from '../core/config/permissions';


/* ─── Animated Space Talent Logo ────────────────────────────────────────── */
const SpaceLogo = ({ size = 48 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        {/* Document Icon */}
        <g>
            <path d="M12 6C12 4.89543 12.8954 4 14 4H30L38 12V42C38 43.1046 37.1046 44 36 44H14C12.8954 44 12 43.1046 12 42V6Z" 
                  fill="var(--logo-doc-fill)" stroke="url(#grad1)" strokeWidth="1.5" />
            <path d="M30 4H30.5L38 11.5V12H30V4Z" fill="#14b8a6" opacity="0.6" />
            <line x1="18" y1="16" x2="32" y2="16" stroke="var(--logo-line)" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
            <line x1="18" y1="22" x2="32" y2="22" stroke="var(--logo-line)" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
            <line x1="18" y1="28" x2="26" y2="28" stroke="var(--logo-line)" strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />
        </g>

        {/* AI Network Circular Symbol */}
        <g transform="translate(12, 22)">
            <g style={{ animation: 'pulse 2s ease-in-out infinite' }}>
                <circle cx="0" cy="0" r="10" fill="var(--logo-ai-fill)" stroke="url(#grad2)" strokeWidth="1.2" filter="url(#glow)" />
                <text x="0" y="3.5" textAnchor="middle" fill="white" fontSize="7" fontWeight="900" style={{ letterSpacing: '0.2px' }}>IA</text>
                
                {/* Orbital Nodes */}
                <g style={{ animation: 'rotate 10s linear infinite' }}>
                    <circle cx="10" cy="0" r="1.5" fill="#14b8a6" />
                    <circle cx="-7" cy="7" r="1.5" fill="#3b82f6" />
                    <circle cx="-7" cy="-7" r="1.5" fill="#8b5cf6" />
                </g>
            </g>
        </g>

        <style>{`
            @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
            @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
    </svg>
);

/* ─── CSS ───────────────────────────────────────────────────────────────────── */
const css = `
@keyframes iconBounce { 0%{transform:scale(1)} 40%{transform:scale(1.3) rotate(-8deg)} 70%{transform:scale(1.15) rotate(4deg)} 100%{transform:scale(1)} }
.nav-lnk:hover .sbico { animation: iconBounce 0.4s ease forwards; }

.nav-lnk { display:flex; align-items:center; gap:10px; padding:10px 14px; margin-bottom:4px; border-radius:10px; text-decoration:none; font-size:14px; font-weight:500; transition: background 0.18s, color 0.18s; color:var(--text-muted); overflow:hidden; white-space:nowrap; position:relative; }
.nav-lnk:hover { background:var(--bg-card) !important; color:var(--text-main) !important; }
.nav-lnk.active { background:var(--sidebar-active); color:var(--sidebar-active-text); }
.nav-lnk.active::before { content:''; position:absolute; left:0; top:25%; bottom:25%; width:3px; background:var(--primary); border-radius:0 4px 4px 0; }
.dd-row { display:flex; align-items:center; gap:10px; padding:9px 14px; border-radius:8px; cursor:pointer; color:var(--text-muted); font-size:13px; transition:background 0.15s; white-space:nowrap; }
.dd-row:hover { background:var(--bg-main); color:var(--text-main); }
.usr-card:hover { background:var(--bg-main) !important; }
.tog-btn:hover { color:var(--text-main) !important; background:var(--bg-card) !important; }
`;

interface NI { to: string; icon: any; label: string; collapsed: boolean; end?: boolean; disabled?: boolean; }
const NavItem = ({ to, icon: Icon, label, collapsed, end, disabled }: NI) => {
    if (disabled) {
        return (
            <div title={collapsed ? `${label} (Premium)` : undefined}
                className="nav-lnk"
                style={{ 
                    justifyContent: collapsed ? 'center' : 'flex-start', 
                    padding: collapsed ? '10px' : '10px 14px',
                    opacity: 0.5,
                    cursor: 'not-allowed'
                }}>
                <Icon className="sbico" style={{ width: 18, height: 18, flexShrink: 0, color: 'gray' }} />
                {!collapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                        <span style={{ fontSize: '13px' }}>{label}</span>
                        <Zap size={10} fill="#f59e0b" stroke="#f59e0b" />
                    </div>
                )}
            </div>
        );
    }
    return (
        <NavLink to={to} end={end} title={collapsed ? label : undefined}
            className={({ isActive }) => `nav-lnk${isActive ? ' active' : ''}`}
            style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '10px' : '10px 14px' }}>
            {({ isActive }) => (
                <>
                    <Icon className="sbico" style={{ width: 18, height: 18, flexShrink: 0, color: isActive ? 'white' : undefined }} />
                    {!collapsed && label}
                </>
            )}
        </NavLink>
    );
};

export const Sidebar = ({ onToggleChat }: { onToggleChat: () => void }) => {
    const { profile } = useUser();
    const { lang, setLang, t } = useLang();
    const { analyzing, progress, jobName } = useAnalysis();
    const navigate = useNavigate();

    // Persist collapsed state in localStorage so navigation doesn't reset it
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sb-col') === '1');
    const [ddOpen, setDdOpen] = useState(false);
    const [langSub, setLangSub] = useState(false);

    // For fixed-position dropdown — capture user card position
    const userCardRef = useRef<HTMLButtonElement>(null);
    const ddRef = useRef<HTMLDivElement>(null);
    const [ddPos, setDdPos] = useState({ bottom: 0, left: 0, right: 0 });

    const toggle = () => setCollapsed(c => { const n = !c; localStorage.setItem('sb-col', n ? '1' : '0'); return n; });
    const handleLogout = async () => { await supabase.auth.signOut(); };

    const openDd = () => {
        if (userCardRef.current) {
            const r = userCardRef.current.getBoundingClientRect();
            setDdPos({ bottom: window.innerHeight - r.top + 6, left: 8, right: 8 });
        }
        setDdOpen(o => !o);
        setLangSub(false);
    };

    useEffect(() => {
        const close = (e: MouseEvent) => {
            const t = e.target as Node;
            // Close if click is outside both the user card button AND the dropdown itself
            const insideCard = userCardRef.current?.contains(t);
            const insideDd = ddRef.current?.contains(t);
            if (!insideCard && !insideDd) {
                setDdOpen(false);
                setLangSub(false);
            }
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const planLabels: Record<string, string> = {
        trial: t('planTrial'), pro: t('planPro'), enterprise: t('planEnterprise'),
    };

    const W = collapsed ? '68px' : '260px';

    return (
        <>
            <style>{css}</style>
            
            {/* Global SVG Defs for consistent gradients across sidebar */}
            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <linearGradient id="grad1" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#14b8a6" />
                        <stop offset="100%" stopColor="#0891b2" />
                    </linearGradient>
                    <linearGradient id="grad2" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>

                </defs>
            </svg>
            <aside style={{ width: W, minWidth: W, background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0, transition: 'width 0.25s cubic-bezier(.4,0,.2,1), min-width 0.25s cubic-bezier(.4,0,.2,1)', overflow: 'hidden' }}>

                {/* Logo + Toggle */}
                <div style={{ 
                    padding: collapsed ? '20px 10px' : '16px 12px', 
                    display: 'flex', 
                    flexDirection: collapsed ? 'column' : 'row',
                    alignItems: 'center', 
                    justifyContent: collapsed ? 'center' : 'space-between', 
                    gap: collapsed ? '12px' : '10px', 
                    minWidth: 0 
                }}>
                    {!collapsed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                            <SpaceLogo size={50} />
                            <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                <p style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.02em', fontFamily: "var(--font-space, 'Space Grotesk', sans-serif)" }}>Space Talent</p>
                                <p style={{ color: 'var(--primary)', fontSize: '10px', fontWeight: 700, margin: '1px 0 0', whiteSpace: 'nowrap', letterSpacing: '0.1em', opacity: 0.9, fontFamily: "var(--font-space, 'Space Grotesk', sans-serif)" }}>IA RECRUITMENT</p>
                            </div>
                        </div>
                    )}
                    <button
                        className={`tog-btn${collapsed ? ' is-collapsed' : ''}`}
                        onClick={toggle}
                        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
                        style={{ 
                            background: collapsed ? 'rgba(59, 130, 246, 0.1)' : 'transparent', 
                            border: collapsed ? '1px solid rgba(59, 130, 246, 0.2)' : 'none', 
                            cursor: 'pointer', 
                            color: 'var(--primary)', 
                            padding: '10px', 
                            borderRadius: '12px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            flexShrink: 0, 
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: collapsed ? '0 0 15px rgba(59, 130, 246, 0.2)' : 'none'
                        }}
                    >
                        <PanelLeft 
                            style={{ 
                                width: 22, 
                                height: 22, 
                                transform: collapsed ? 'rotate(180deg)' : 'none',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                color: 'var(--primary)',
                                strokeWidth: 2
                            }} 
                        />
                    </button>
                </div>

                <div style={{ height: '1px', background: 'var(--border)', margin: '0 10px 10px' }} />

                {!collapsed && (
                    <p style={{ color: 'var(--text-dim)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 20px', marginBottom: '8px' }}>{t('menu')}</p>
                )}

                {/* Nav items */}
                <nav style={{ flex: 1, padding: '0 8px', overflowY: 'auto', overflowX: 'hidden' }}>
                    {/* Dashboard - todos os perfis exceto convidado */}
                    {hasPermission(profile.user_role, 'dashboard') && (
                        <NavItem to="/dashboard" icon={LayoutGrid} label={t('dashboard')} collapsed={collapsed} end />
                    )}
                    
                    {/* Vagas - apenas admin e rh */}
                    {hasPermission(profile.user_role, 'vagas') && (
                        <NavItem to="/vagas" icon={Briefcase} label={t('vagas')} collapsed={collapsed} />
                    )}
                    
                    {/* Análises - admin, rh e gestor */}
                    {hasPermission(profile.user_role, 'analises') && (
                        <NavItem to="/analises" icon={Activity} label={t('analyses')} collapsed={collapsed} />
                    )}
                    
                    {/* Candidatos - admin, rh e gestor */}
                    {hasPermission(profile.user_role, 'candidatos') && (
                        <NavItem to="/candidatos" icon={Users} label={t('candidateBank')} collapsed={collapsed} />
                    )}

                    {/* Pipeline - premium feature, mas com permissão por perfil */}
                    {hasPermission(profile.user_role, 'pipeline') && (
                        <NavItem to="/pipeline" icon={Kanban} label="Pipeline" collapsed={collapsed} disabled={!profile.isPremium} />
                    )}
                    
                    {/* Chat - apenas admin e gestor (premium) */}
                    {hasPermission(profile.user_role, 'chat') && (
                        <NavItem to="/chat" icon={MessageSquare} label="Chat" collapsed={collapsed} disabled={!profile.isPremium} />
                    )}

                    {/* Admin section - apenas admin */}
                    {hasPermission(profile.user_role, 'admin') && (
                        <>
                            <div style={{ height: '1px', background: 'var(--border)', margin: '20px 8px 12px' }} />
                            {!collapsed && (
                                <p style={{ color: 'var(--text-dim)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 20px', marginBottom: '8px' }}>Administração</p>
                            )}
                            <NavItem to="/admin" icon={ShieldCheck} label="Painel Administrador" collapsed={collapsed} end />
                            <NavItem to="/admin/logs" icon={Database} label="Logs de atividade" collapsed={collapsed} />
                        </>
                    )}
                </nav>

                {/* Analysis Progress - Background indicator */}
                {analyzing && !collapsed && (
                    <div
                        onClick={() => navigate('/analise/nova')}
                        style={{
                            padding: '12px 14px',
                            margin: '0 8px 10px',
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = '#1e202e';
                            e.currentTarget.style.borderColor = '#6366f144';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = '#1a1c27';
                            e.currentTarget.style.borderColor = '#1f2332';
                        }}
                    >
                        <p style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Zap size={10} className="text-yellow-500 fill-yellow-500" />
                            Analisando: {jobName}
                        </p>
                        <div style={{ height: '6px', background: 'var(--bg-main)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${(progress.current / (progress.total || 1)) * 100}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }} />
                        </div>
                        <p style={{ color: 'var(--primary)', fontSize: '10px', marginTop: '6px', fontWeight: 700 }}>{progress.current} / {progress.total} CVs</p>
                    </div>
                )}
                {analyzing && collapsed && (
                    <div
                        onClick={() => navigate('/analise/nova')}
                        title={`Analisando: ${jobName} (${progress.current}/${progress.total})`}
                        style={{ margin: '0 10px 10px', display: 'flex', justifyContent: 'center', cursor: 'pointer' }}
                    >
                        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap size={10} style={{ color: 'var(--primary)' }} />
                        </div>
                    </div>
                )}

                <div style={{ padding: '0 8px', marginBottom: '10px' }}>
                    {hasPermission(profile.user_role, 'chat') && (
                        <button
                            onClick={profile.isPremium ? onToggleChat : undefined}
                            className="nav-lnk"
                            style={{
                                width: '100%',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                padding: collapsed ? '10px' : '10px 14px',
                                background: 'none',
                                border: 'none',
                                cursor: profile.isPremium ? 'pointer' : 'not-allowed',
                                opacity: profile.isPremium ? 1 : 0.6
                            }}
                        >
                            <Bot className="sbico" style={{ width: 18, height: 18, flexShrink: 0, color: profile.isPremium ? '#22c55e' : 'var(--text-dim)' }} />
                            {!collapsed && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                                    <span style={{ color: profile.isPremium ? '#22c55e' : 'var(--text-dim)', fontWeight: 600 }}>Assistente IA</span>
                                    {!profile.isPremium && <Zap size={10} fill="#f59e0b" stroke="#f59e0b" />}
                                </div>
                            )}
                        </button>
                    )}
                </div>

                {/* Bottom */}
                <div style={{ padding: '0 8px 20px' }}>
                    <div style={{ height: '1px', background: 'var(--border)', margin: '0 4px 10px' }} />

                    {/* User card */}
                    <button
                        ref={userCardRef}
                        className="usr-card"
                        onClick={openDd}
                        title={collapsed ? (profile.firstName || 'Usuário') : undefined}
                        style={{ display: 'flex', alignItems: 'center', gap: collapsed ? '0' : '12px', padding: collapsed ? '8px 0' : '9px 10px 9px 14px', borderRadius: '10px', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'background 0.15s', justifyContent: 'flex-start' }}
                    >
                        {/* Avatar — always centered when collapsed */}
                        <div style={{ width: '100%', display: 'flex', justifyContent: collapsed ? 'center' : 'flex-start', alignItems: 'center', gap: collapsed ? '0' : '12px', minWidth: 0 }}>
                            {profile.avatarUrl ? (
                                <img src={profile.avatarUrl} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)', flexShrink: 0, display: 'block' }} />
                            ) : (
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0, border: '2px solid var(--border)' }}>
                                    {profile.initials || '?'}
                                </div>
                            )}
                            {!collapsed && (
                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                    <p style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.firstName || '...'}</p>
                                    <p style={{ color: 'var(--text-dim)', fontSize: '11px', margin: 0 }}>{planLabels[profile.plan] || t('planTrial')}</p>
                                </div>
                            )}
                        </div>
                    </button>
                </div>
            </aside>

            {/* Dropdown — rendered in portal position (fixed) to avoid aside overflow clipping */}
            {ddOpen && (
                <div
                    ref={ddRef}
                    style={{ position: 'fixed', bottom: ddPos.bottom, left: collapsed ? '76px' : ddPos.left, right: collapsed ? 'auto' : undefined, width: collapsed ? '200px' : `calc(260px - 16px)`, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '6px', boxShadow: '0 -8px 32px rgba(0,0,0,0.5)', zIndex: 9999 }}
                    onMouseLeave={() => setLangSub(false)}
                >
                    <p style={{ color: 'var(--text-dim)', fontSize: '12px', padding: '8px 14px 10px', margin: 0, borderBottom: '1px solid var(--border)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.email}</p>

                    <div className="dd-row" style={{ marginTop: 4 }} onMouseEnter={() => setLangSub(false)} onClick={() => { setDdOpen(false); navigate('/configuracoes'); }}>
                        <Settings style={{ width: 15, height: 15, flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{t('settings')}</span>
                    </div>

                    <div className="dd-row" style={{ position: 'relative' }}
                        onMouseEnter={() => setLangSub(true)}>
                        <Globe style={{ width: 15, height: 15, flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{t('language')}</span>
                        <ChevronRight style={{ width: 13, height: 13, color: 'var(--text-dim)' }} />
                        {langSub && (
                            <div style={{ position: 'absolute', bottom: 0, left: 'calc(100% + 4px)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '6px', minWidth: '175px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', zIndex: 10000 }}>
                                {([['pt', '🇧🇷  Português (Brasil)'], ['en', '🇺🇸  English (US)']] as const).map(([code, label]) => (
                                    <div key={code} className="dd-row" style={{ justifyContent: 'space-between' }}
                                        onClick={() => { setLang(code); setLangSub(false); setDdOpen(false); }}>
                                        <span>{label}</span>
                                        {lang === code && <Check style={{ width: 13, height: 13, color: 'var(--primary)', flexShrink: 0 }} />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="dd-row" onMouseEnter={() => setLangSub(false)} onClick={() => { setDdOpen(false); navigate('/ajuda'); }}>
                        <HelpCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
                        <span>{t('help')}</span>
                    </div>

                    <div style={{ height: '1px', background: 'var(--border)', margin: '6px 0' }} />

                    <div className="dd-row" onMouseEnter={() => setLangSub(false)} onClick={handleLogout} style={{ color: '#ef4444' }}>
                        <LogOut style={{ width: 15, height: 15, flexShrink: 0, color: '#ef4444' }} />
                        <span>{t('logout')}</span>
                    </div>
                </div>
            )}
        </>
    );
};
