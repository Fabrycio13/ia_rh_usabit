import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, Activity, Users, LogOut, Globe, HelpCircle, ChevronRight, Check, PanelLeftClose, PanelLeftOpen, Settings, MessageSquare, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../contexts/UserContext';
import { useLang } from '../../contexts/LangContext';
import { useAnalysis } from '../../contexts/AnalysisContext';

/* ─── Animated AI Resume Logo ──────────────────────────────────────────────── */
const AiLogo = () => (
    <svg width="36" height="36" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <defs>
            <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
            <filter id="gw"><feGaussianBlur stdDeviation="1.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <rect x="6" y="3" width="22" height="28" rx="3" fill="#1a1c2d" stroke="url(#lg1)" strokeWidth="1.5" />
        <path d="M22 3 L28 9 L22 9 Z" fill="#6366f1" opacity="0.7" />
        <line x1="10" y1="14" x2="24" y2="14" stroke="#6366f1" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
        <line x1="10" y1="18" x2="20" y2="18" stroke="#6366f1" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
        <line x1="10" y1="22" x2="22" y2="22" stroke="#6366f1" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
        <line x1="8" y1="14" x2="26" y2="14" stroke="#818cf8" strokeWidth="1.2" filter="url(#gw)">
            <animateTransform attributeName="transform" type="translate" values="0,0;0,10;0,0" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2.5s" repeatCount="indefinite" />
        </line>
        <circle cx="32" cy="10" r="2.4" fill="#6366f1" filter="url(#gw)"><animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite" /></circle>
        <circle cx="35" cy="20" r="1.8" fill="#a78bfa" filter="url(#gw)"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.8s" repeatCount="indefinite" /></circle>
        <circle cx="32" cy="30" r="2.4" fill="#6366f1" filter="url(#gw)"><animate attributeName="opacity" values="1;0.3;1" dur="2.2s" repeatCount="indefinite" /></circle>
        <line x1="28" y1="13" x2="30" y2="10" stroke="#6366f1" strokeWidth="0.8" opacity="0.5" />
        <line x1="28" y1="20" x2="33" y2="20" stroke="#a78bfa" strokeWidth="0.8" opacity="0.5" />
        <line x1="28" y1="27" x2="30" y2="30" stroke="#6366f1" strokeWidth="0.8" opacity="0.5" />
    </svg>
);

/* ─── CSS ───────────────────────────────────────────────────────────────────── */
const css = `
@keyframes iconBounce { 0%{transform:scale(1)} 40%{transform:scale(1.3) rotate(-8deg)} 70%{transform:scale(1.15) rotate(4deg)} 100%{transform:scale(1)} }
.nav-lnk:hover .sbico { animation: iconBounce 0.4s ease forwards; }
.nav-lnk { display:flex; align-items:center; gap:10px; padding:10px 14px; margin-bottom:4px; border-radius:10px; text-decoration:none; font-size:14px; font-weight:500; transition: background 0.18s, color 0.18s; color:#94a3b8; overflow:hidden; white-space:nowrap; }
.nav-lnk:hover { background:#1a1c27 !important; color:#ffffff !important; }
.nav-lnk.active { background:#ffffff; color:#0b0d12; }
.dd-row { display:flex; align-items:center; gap:10px; padding:9px 14px; border-radius:8px; cursor:pointer; color:#94a3b8; font-size:13px; transition:background 0.15s; white-space:nowrap; }
.dd-row:hover { background:#1a1c2e; color:#f1f5f9; }
.usr-card:hover { background:#13161f !important; }
.tog-btn:hover { color:#f1f5f9 !important; background:#1a1c27 !important; }
`;

interface NI { to: string; icon: any; label: string; collapsed: boolean; }
const NavItem = ({ to, icon: Icon, label, collapsed }: NI) => {
    const loc = useLocation();
    const active = loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to));
    return (
        <NavLink to={to} title={collapsed ? label : undefined}
            className={`nav-lnk${active ? ' active' : ''}`}
            style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '10px' : '10px 14px' }}>
            <Icon className="sbico" style={{ width: 18, height: 18, flexShrink: 0, color: active ? '#0b0d12' : undefined }} />
            {!collapsed && label}
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
            <aside style={{ width: W, minWidth: W, background: '#0B0D12', borderRight: '1px solid #1F2332', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0, transition: 'width 0.25s cubic-bezier(.4,0,.2,1), min-width 0.25s cubic-bezier(.4,0,.2,1)', overflow: 'hidden' }}>

                {/* Logo + Toggle */}
                <div style={{ padding: '20px 10px 18px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: '8px', minWidth: 0 }}>
                    {!collapsed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, overflow: 'hidden' }}>
                            <AiLogo />
                            <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                <p style={{ color: '#ffffff', fontSize: '13px', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Analista de currículos</p>
                                <p style={{ color: '#64748b', fontSize: '11px', margin: 0, whiteSpace: 'nowrap' }}>Agentes de IA by usabit</p>
                            </div>
                        </div>
                    )}
                    <button
                        className="tog-btn"
                        onClick={toggle}
                        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#4a5568', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s, color 0.15s' }}
                    >
                        {collapsed ? <PanelLeftOpen style={{ width: 18, height: 18 }} /> : <PanelLeftClose style={{ width: 18, height: 18 }} />}
                    </button>
                </div>

                <div style={{ height: '1px', background: '#1F2332', margin: '0 10px 10px' }} />

                {!collapsed && (
                    <p style={{ color: '#4a5568', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 20px', marginBottom: '8px' }}>{t('menu')}</p>
                )}

                {/* Nav items */}
                <nav style={{ flex: 1, padding: '0 8px', overflowY: 'auto', overflowX: 'hidden' }}>
                    <NavItem to="/" icon={LayoutGrid} label={t('dashboard')} collapsed={collapsed} />
                    <NavItem to="/analises" icon={Activity} label={t('analyses')} collapsed={collapsed} />
                    <NavItem to="/candidatos" icon={Users} label={t('candidateBank')} collapsed={collapsed} />
                </nav>

                {/* Analysis Progress - Background indicator */}
                {analyzing && !collapsed && (
                    <div
                        onClick={() => navigate('/analise/nova')}
                        style={{
                            padding: '12px 14px',
                            margin: '0 8px 10px',
                            background: '#1a1c27',
                            borderRadius: '12px',
                            border: '1px solid #1f2332',
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
                        <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Zap size={10} className="text-yellow-500 fill-yellow-500" />
                            Analisando: {jobName}
                        </p>
                        <div style={{ height: '6px', background: '#0b0d12', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${(progress.current / (progress.total || 1)) * 100}%`, height: '100%', background: '#6366f1', transition: 'width 0.3s ease' }} />
                        </div>
                        <p style={{ color: '#6366f1', fontSize: '10px', marginTop: '6px', fontWeight: 700 }}>{progress.current} / {progress.total} CVs</p>
                    </div>
                )}
                {analyzing && collapsed && (
                    <div
                        onClick={() => navigate('/analise/nova')}
                        title={`Analisando: ${jobName} (${progress.current}/${progress.total})`}
                        style={{ margin: '0 10px 10px', display: 'flex', justifyContent: 'center', cursor: 'pointer' }}
                    >
                        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #1f2332', borderTopColor: '#6366f1', animation: 'spin 1s linear infinite', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap size={10} style={{ color: '#6366f1' }} />
                        </div>
                    </div>
                )}

                <div style={{ padding: '0 8px', marginBottom: '10px' }}>
                    <button
                        onClick={onToggleChat}
                        className="nav-lnk"
                        style={{
                            width: '100%',
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            padding: collapsed ? '10px' : '10px 14px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        <MessageSquare className="sbico" style={{ width: 18, height: 18, flexShrink: 0, color: '#22c55e' }} />
                        {!collapsed && <span style={{ color: '#22c55e', fontWeight: 600 }}>Assistente IA</span>}
                    </button>
                </div>

                {/* Bottom */}
                <div style={{ padding: '0 8px 20px' }}>
                    <div style={{ height: '1px', background: '#1F2332', margin: '0 4px 10px' }} />

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
                                <img src={profile.avatarUrl} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #1F2332', flexShrink: 0, display: 'block' }} />
                            ) : (
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0, border: '2px solid #1F2332' }}>
                                    {profile.initials || '?'}
                                </div>
                            )}
                            {!collapsed && (
                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                    <p style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.firstName || '...'}</p>
                                    <p style={{ color: '#4a5568', fontSize: '11px', margin: 0 }}>{planLabels[profile.plan] || t('planTrial')}</p>
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
                    style={{ position: 'fixed', bottom: ddPos.bottom, left: collapsed ? '76px' : ddPos.left, right: collapsed ? 'auto' : undefined, width: collapsed ? '200px' : `calc(260px - 16px)`, background: '#131621', border: '1px solid #1F2332', borderRadius: '12px', padding: '6px', boxShadow: '0 -8px 32px rgba(0,0,0,0.5)', zIndex: 9999 }}
                    onMouseLeave={() => setLangSub(false)}
                >
                    <p style={{ color: '#4a5568', fontSize: '12px', padding: '8px 14px 10px', margin: 0, borderBottom: '1px solid #1F2332', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.email}</p>

                    <div className="dd-row" style={{ marginTop: 4 }} onMouseEnter={() => setLangSub(false)} onClick={() => { setDdOpen(false); navigate('/configuracoes'); }}>
                        <Settings style={{ width: 15, height: 15, flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{t('settings')}</span>
                    </div>

                    <div className="dd-row" style={{ position: 'relative' }}
                        onMouseEnter={() => setLangSub(true)}>
                        <Globe style={{ width: 15, height: 15, flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{t('language')}</span>
                        <ChevronRight style={{ width: 13, height: 13, color: '#4a5568' }} />
                        {langSub && (
                            <div style={{ position: 'absolute', bottom: 0, left: 'calc(100% + 4px)', background: '#131621', border: '1px solid #1F2332', borderRadius: '10px', padding: '6px', minWidth: '175px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', zIndex: 10000 }}>
                                {([['pt', '🇧🇷  Português (Brasil)'], ['en', '🇺🇸  English (US)']] as const).map(([code, label]) => (
                                    <div key={code} className="dd-row" style={{ justifyContent: 'space-between' }}
                                        onClick={() => { setLang(code); setLangSub(false); setDdOpen(false); }}>
                                        <span>{label}</span>
                                        {lang === code && <Check style={{ width: 13, height: 13, color: '#6366f1', flexShrink: 0 }} />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="dd-row" onMouseEnter={() => setLangSub(false)} onClick={() => { setDdOpen(false); navigate('/ajuda'); }}>
                        <HelpCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
                        <span>{t('help')}</span>
                    </div>

                    <div style={{ height: '1px', background: '#1F2332', margin: '6px 0' }} />

                    <div className="dd-row" onMouseEnter={() => setLangSub(false)} onClick={handleLogout} style={{ color: '#ef4444' }}>
                        <LogOut style={{ width: 15, height: 15, flexShrink: 0, color: '#ef4444' }} />
                        <span>{t('logout')}</span>
                    </div>
                </div>
            )}
        </>
    );
};
