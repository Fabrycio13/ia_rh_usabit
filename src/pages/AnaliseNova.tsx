import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate as _useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useUser } from '../contexts/UserContext';
import { useAnalysis } from '../contexts/AnalysisContext';
import {
    Upload, FileSpreadsheet, FileText,
    Download, Zap, Trophy, ArrowLeft, Star, ClipboardList, Check,
    UserRound, Mail, Phone, MapPin, Calendar, ChevronRight, XCircle, X
} from 'lucide-react';
import {
    PieChart, Pie, Cell, Legend, Tooltip as RechartTooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Candidate {
    id: string;
    name: string;
    age: string | null;
    location: string | null;
    gender: string | null;
    email: string | null;
    phone: string | null;
    score: number;
    skills: string | null;
    experience: string | null;
    education: string | null;
    attention_points: string | null;
    source: 'pdf' | 'excel';
    resumeUrl: string | null;
    dbId: string | null; // ID real no banco após salvamento
}

interface AnalysisResult {
    summary: string;
    candidates: Candidate[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Separa qualquer texto de skills em chips individuais */
function parseSkills(raw: string | null | undefined): string[] {
    if (!raw) return [];
    // Remove frases comuns de contexto
    let cleaned = raw
        .replace(/experiência em/gi, '')
        .replace(/conhecimento em/gi, '')
        .replace(/domínio de/gi, '')
        .replace(/habilidade em/gi, '')
        .replace(/proficiência em/gi, '');
    // Divide por separadores: vírgula, ponto e vírgula, ' e ', ' ou ', ' / ', ' e/ou '
    const parts = cleaned.split(/,|;|\se\/ou\s|\sou\s|\se\s|\//);
    return parts
        .map(s => s.replace(/[.]/g, '').trim())
        .filter(s => s.length > 1 && s.length < 60);
}

const initials = (name: string) =>
    name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();

const scoreColor = (s: number) =>
    s >= 70 ? '#10b981' : s >= 40 ? '#f59e0b' : '#ef4444';

const TT_STYLE = {
    background: '#13151C', border: '1px solid #1F2332',
    borderRadius: 8, fontSize: 12, padding: '8px 12px',
};
const TIT_STYLE = { color: '#94a3b8', marginBottom: 4, fontWeight: 600 };

// ─── Toggle ───────────────────────────────────────────────────────────────────

// ─── Candidate Detail Panel ───────────────────────────────────────────────────
function CandidatePanel({ candidate, onClose }: { candidate: Candidate; onClose: () => void }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
        }}>
            {/* Backdrop */}
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />

            {/* Panel */}
            <div style={{
                position: 'relative', zIndex: 1, width: 480, height: '100vh',
                background: '#0d0f17', borderLeft: '1px solid #1f2332',
                overflowY: 'auto', display: 'flex', flexDirection: 'column',
            }} className="custom-scrollbar">
                {/* Header */}
                <div style={{ padding: '32px 28px 24px', borderBottom: '1px solid #1f2332' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: '50%', background: '#6366f1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0,
                            }}>{initials(candidate.name)}</div>
                            <div>
                                <p style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>{candidate.name}</p>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
                                    background: '#1a2350', border: '1px solid #2d3a6e', borderRadius: 6,
                                    padding: '2px 10px', fontSize: 11, color: '#818cf8',
                                }}>
                                    <ChevronRight size={10} strokeWidth={3} />
                                    {candidate.source === 'excel' ? 'Carregado via Excel' : 'Carregado via PDF'}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{ background: '#1a1c27', border: '1px solid #1f2332', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#94a3b8' }}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Meta */}
                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8' }}>
                            <MapPin size={13} />{candidate.location ?? 'Não informado'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8' }}>
                            <Calendar size={13} />{(candidate.age && !['Não informado', 'não informado', '—'].includes(candidate.age)) ? `${candidate.age} anos` : 'Não informado'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94a3b8' }}>
                            <UserRound size={13} />{candidate.gender ?? 'Não informado'}
                        </span>
                    </div>
                </div>

                {/* Score */}
                <div style={{ padding: '16px 28px', borderBottom: '1px solid #1f2332', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</span>
                    <span style={{
                        background: `${scoreColor(candidate.score)}22`,
                        color: scoreColor(candidate.score),
                        border: `1px solid ${scoreColor(candidate.score)}44`,
                        borderRadius: 8, padding: '4px 14px', fontSize: 15, fontWeight: 700,
                    }}>{candidate.score}%</span>
                </div>

                {/* Body */}
                <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Contato */}
                    <section>
                        <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Informações de Contato</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: '#12141d', borderRadius: 12, border: '1px solid #1f2332', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #1f2332' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8' }}><Mail size={14} />Email</span>
                                <span style={{ fontSize: 13, color: candidate.email ? '#e2e8f0' : '#475569' }}>{candidate.email ?? 'Não informado'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8' }}><Phone size={14} />Telefone</span>
                                <span style={{ fontSize: 13, color: candidate.phone ? '#e2e8f0' : '#475569' }}>{candidate.phone ?? 'Não informado'}</span>
                            </div>
                        </div>
                    </section>

                    {candidate.skills && (
                        <section>
                            <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Habilidades</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {parseSkills(candidate.skills).map(s => (
                                    <span key={s} style={{
                                        background: '#1a1c27', border: '1px solid #2d3147', borderRadius: 6,
                                        padding: '4px 12px', fontSize: 12, color: '#c7d2fe', fontWeight: 500,
                                    }}>{s}</span>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Experiência */}
                    {candidate.experience && (
                        <section>
                            <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Experiência</p>
                            <p style={{ fontSize: 14, color: '#e2e8f0', lineHeight: '1.6' }}>{candidate.experience}</p>
                        </section>
                    )}

                    {/* Formação */}
                    {candidate.education && (
                        <section>
                            <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Formação</p>
                            <p style={{ fontSize: 14, color: '#e2e8f0' }}>{candidate.education}</p>
                        </section>
                    )}

                    {/* Pontos de Atenção */}
                    <section>
                        <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Pontos de Atenção</p>
                        {candidate.attention_points ? (
                            <ul style={{ paddingLeft: 0, margin: 0, listStyle: 'none' }}>
                                {candidate.attention_points.split('\n').filter(Boolean).map((p, i) => (
                                    <li key={i} style={{ fontSize: 13, color: '#fca5a5', marginBottom: 4 }}>• {p}</li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>• Nenhum identificado.</p>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

// ─── Results View ─────────────────────────────────────────────────────────────
function ResultsView({ result, jobName, onBack, userId }: { result: AnalysisResult; jobName: string; onBack: () => void; userId: string }) {
    const byScore = (a: Candidate, b: Candidate) => b.score - a.score;
    const best = result.candidates.filter(c => (c.score || 0) >= 70).sort(byScore);
    const mid = result.candidates.filter(c => (c.score || 0) >= 40 && (c.score || 0) < 70).sort(byScore);
    const worst = result.candidates.filter(c => (c.score || 0) < 40).sort(byScore);

    const [activeTab, setActiveTab] = useState<'best' | 'mid' | 'worst'>(() => {
        if (best.length > 0) return 'best';
        if (mid.length > 0) return 'mid';
        return 'worst';
    });
    const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
        try { return userId ? JSON.parse(localStorage.getItem(`fav-${userId}`) ?? '{}') : {}; } catch { return {}; }
    });

    // Favorites keyed by candidate local id (always available, even before DB save)
    const toggleFav = (candidateId: string) => {
        setFavorites(prev => {
            const next = { ...prev, [candidateId]: !prev[candidateId] };
            try { localStorage.setItem(`fav-${userId}`, JSON.stringify(next)); } catch { }
            return next;
        });
    };
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

    const displayed = activeTab === 'best' ? best : activeTab === 'mid' ? mid : worst;
    const sortedAll = [...result.candidates].sort(byScore);

    // Chart data
    const genderMap: Record<string, number> = {};
    result.candidates.forEach(c => {
        const g = c.gender ?? 'Não informado';
        genderMap[g] = (genderMap[g] ?? 0) + 1;
    });
    // Garantir ordem específica para cores fixas: Masculino (Azul), Feminino (Rosa), outros...
    const genderOrder = ['Masculino', 'Feminino', 'Outro', 'Não informado'];
    const genderData = genderOrder
        .filter(g => genderMap[g] !== undefined)
        .map(name => ({ name, value: genderMap[name] }));

    // Adicionar os que sobraram (caso a IA retorne algo diferente)
    Object.keys(genderMap).forEach(g => {
        if (!genderOrder.includes(g)) genderData.push({ name: g, value: genderMap[g] });
    });

    const GENDER_COLORS: Record<string, string> = {
        'Masculino': '#3b82f6', // Azul
        'Feminino': '#ec4899',   // Rosa
        'Não informado': '#64748b'
    };
    const PIE_COLORS = ['#3b82f6', '#ec4899', '#1a1c27'];

    const ageMap: Record<string, number> = {};
    result.candidates.forEach(c => {
        const a = c.age ?? 'N/A';
        ageMap[a] = (ageMap[a] ?? 0) + 1;
    });
    const ageData = Object.entries(ageMap).map(([name, value]) => ({ name, value }));

    const locMap: Record<string, number> = {};
    result.candidates.forEach(c => {
        const l = c.location ?? 'N/A';
        locMap[l] = (locMap[l] ?? 0) + 1;
    });
    const locData = Object.entries(locMap).slice(0, 5).map(([name, value]) => ({ name, value }));

    const tabs = [
        { key: 'best' as const, label: `Melhores`, count: best.length, color: '#10b981' },
        { key: 'mid' as const, label: `Intermediários`, count: mid.length, color: '#f59e0b' },
        { key: 'worst' as const, label: `Piores`, count: worst.length, color: '#ef4444' },
    ];

    return (
        <div style={{ background: '#0E1015', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
            {/* Top bar */}
            <div style={{ background: '#0b0d12', borderBottom: '1px solid #1f2332', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 13 }}>
                        <ArrowLeft size={16} />Voltar
                    </button>
                    <span style={{ color: '#1f2332' }}>|</span>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{jobName}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={() => setActiveTab('best')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, background: activeTab === 'best' ? 'rgba(99,102,241,0.1)' : 'transparent',
                            border: '1px solid #1f2332', borderRadius: 8, padding: '6px 14px', color: activeTab === 'best' ? '#818cf8' : '#94a3b8',
                            fontSize: 13, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        <Star size={14} fill={activeTab === 'best' ? '#818cf8' : 'none'} />Sugestões da IA ({best.length})
                    </button>
                    <button
                        onClick={onBack}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.05)',
                            border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 14px',
                            color: '#f87171', fontSize: 13, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.4)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.05)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.2)';
                        }}
                    >
                        <X size={14} />Sair da análise
                    </button>
                </div>
            </div>

            <div style={{ padding: '40px 40px 80px' }}>
                {/* Header */}
                <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Candidatos analisados</h1>
                <p style={{ color: '#94a3b8', fontSize: 14, maxWidth: 760, lineHeight: 1.6, marginBottom: 32 }}>{result.summary}</p>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 2, marginBottom: 32, background: '#12141d', borderRadius: 12, padding: 4, width: 'fit-content' }}>
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key)}
                            style={{
                                padding: '8px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                                background: activeTab === t.key ? '#fff' : 'transparent',
                                color: activeTab === t.key ? '#0b0d12' : '#64748b',
                                transition: 'all 0.15s',
                            }}
                        >
                            {t.label}({t.count})
                        </button>
                    ))}
                </div>

                {/* Charts */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 40 }}>
                    {/* Gender Pie */}
                    <div style={{ background: '#15171e', border: '1px solid #1f2332', borderRadius: 16, padding: '20px 16px' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>Distribuição por Gênero</p>
                        <div style={{ height: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={genderData} cx="50%" cy="45%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                                        {genderData.map((d, i) => (
                                            <Cell key={i} fill={GENDER_COLORS[d.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartTooltip
                                        contentStyle={{ ...TT_STYLE, border: 'none' }}
                                        itemStyle={{ color: '#fff' }}
                                        labelStyle={TIT_STYLE}
                                        cursor={false}
                                    />
                                    <Legend
                                        wrapperStyle={{ fontSize: 11 }}
                                        formatter={(v, entry: any) => (
                                            <span style={{ color: entry.color || '#fff' }}>
                                                {v} ({entry.payload?.value ?? 0})
                                            </span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Age Bar */}
                    <div style={{ background: '#15171e', border: '1px solid #1f2332', borderRadius: 16, padding: '20px 16px' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>Distribuição por Idade</p>
                        <div style={{ height: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={ageData} barCategoryGap="30%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2332" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <RechartTooltip
                                        contentStyle={{ ...TT_STYLE, border: 'none' }}
                                        itemStyle={{ color: '#fff' }}
                                        labelStyle={TIT_STYLE}
                                        cursor={false}
                                    />
                                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={36} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Location */}
                    <div style={{ background: '#15171e', border: '1px solid #1f2332', borderRadius: 16, padding: '20px 16px' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>Localidades Principais</p>
                        <div style={{ height: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={locData} layout="vertical" barCategoryGap="30%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2332" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <RechartTooltip
                                        contentStyle={{ ...TT_STYLE, border: 'none' }}
                                        itemStyle={{ color: '#fff' }}
                                        labelStyle={TIT_STYLE}
                                        cursor={false}
                                    />
                                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div style={{ background: '#15171e', border: '1px solid #1f2332', borderRadius: 16, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <colgroup>
                            <col style={{ width: '6%' }} />
                            <col style={{ width: '26%' }} />
                            <col style={{ width: '9%' }} />
                            <col style={{ width: '18%' }} />
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '11%' }} />
                            <col style={{ width: '18%' }} />
                        </colgroup>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #1f2332', background: '#12141d' }}>
                                {['Rank', 'Nome', 'Idade', 'Localização', 'Gênero', 'Score', 'Ações'].map(h => (
                                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {displayed.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                                    Nenhum candidato nesta categoria.
                                </td></tr>
                            ) : displayed.map((c) => (
                                <tr key={c.id}
                                    onClick={() => setSelectedCandidate(c)}
                                    style={{ borderBottom: '1px solid #1a1c27', cursor: 'pointer' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    {/* Rank */}
                                    <td style={{ padding: '14px 16px', fontWeight: 700, color: (sortedAll.indexOf(c) < 3 && (c.score || 0) >= 70) ? '#f59e0b' : '#64748b' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {(sortedAll.indexOf(c) < 3 && (c.score || 0) >= 70) ? ['🥇', '🥈', '🥉'][sortedAll.indexOf(c)] : null}
                                            {sortedAll.indexOf(c) + 1}
                                        </span>
                                    </td>
                                    {/* Nome */}
                                    <td style={{ padding: '14px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#6366f122', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                                {initials(c.name)}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <p style={{ color: '#f8fafc', fontWeight: 500, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                                                {c.email && <p style={{ color: '#475569', fontSize: 11, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    {/* Idade */}
                                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8' }}>
                                        {(c.age && !/n[ãa]o\s*informado/i.test(c.age)) ? `${c.age} anos` : '—'}
                                    </td>
                                    {/* Localização */}
                                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {c.location ?? '—'}
                                    </td>
                                    {/* Gênero */}
                                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                        {c.gender ?? '—'}
                                    </td>
                                    {/* Score */}
                                    <td style={{ padding: '14px 16px' }}>
                                        <span style={{ background: `${scoreColor(c.score)}22`, color: scoreColor(c.score), border: `1px solid ${scoreColor(c.score)}44`, borderRadius: 20, padding: '3px 12px', fontWeight: 700 }}>
                                            {c.score}%
                                        </span>
                                    </td>
                                    {/* Ações */}
                                    <td style={{ padding: '14px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <button
                                                title="Favoritar"
                                                onClick={e => { e.stopPropagation(); toggleFav(c.id); }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: favorites[c.id] ? '#fbbf24' : '#64748b', padding: 6, borderRadius: 6 }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(251,191,36,0.1)'; }}
                                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
                                            >
                                                <Star size={16} fill={favorites[c.id] ? '#fbbf24' : 'none'} strokeWidth={1.5} />
                                            </button>
                                            <button
                                                title={c.resumeUrl ? 'Abrir Currículo' : (c.source === 'excel' ? 'Currículo não disponível (Excel)' : 'PDF não disponível')}
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    if (c.resumeUrl) {
                                                        const a = document.createElement('a');
                                                        a.href = c.resumeUrl; a.target = '_blank'; a.rel = 'noopener noreferrer';
                                                        document.body.appendChild(a); a.click(); document.body.removeChild(a);
                                                    } else {
                                                        toast.error(c.source === 'excel' ? 'Currículos do Excel não possuem PDF.' : 'PDF não disponível para este candidato.');
                                                    }
                                                }}
                                                style={{ background: 'none', border: 'none', cursor: c.resumeUrl ? 'pointer' : 'not-allowed', color: c.resumeUrl ? '#818cf8' : '#2d3147', padding: 6, borderRadius: 6 }}
                                                onMouseEnter={e => { if (c.resumeUrl) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.1)'; }}
                                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
                                            >
                                                <ClipboardList size={16} />
                                            </button>
                                            <button
                                                title="Ver Perfil Completo"
                                                onClick={e => { e.stopPropagation(); setSelectedCandidate(c); }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 6, borderRadius: 6 }}
                                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.1)'}
                                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
                                            >
                                                <UserRound size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedCandidate && (
                <CandidatePanel candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} />
            )}
        </div>
    );
}

// ─── Excel Template ───────────────────────────────────────────────────────────
const EXCEL_TEMPLATE_COLS = [
    { name: 'Nome Completo', desc: 'Nome do candidato' },
    { name: 'Email', desc: 'Email para contato' },
    { name: 'WhatsApp', desc: 'Número de telefone' },
    { name: 'Experiência', desc: 'Descrição da experiência profissional' },
    { name: 'Formação/Educação', desc: 'Nível de escolaridade' },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export const AnaliseNova = () => {
    const { profile } = useUser();
    const { analyzing, progress, result, error, startAnalysis, clearAnalysis, setError, jobName: ctxJobName } = useAnalysis();
    const [searchParams, setSearchParams] = useSearchParams();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // If "new=true" is in URL, clear existing analysis and remove param
    useEffect(() => {
        if (searchParams.get('new') === 'true') {
            clearAnalysis();
            // Remove the param so refresh doesn't keep clearing
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('new');
            setSearchParams(newParams, { replace: true });
        }
    }, [searchParams, clearAnalysis, setSearchParams]);

    // Form state
    const [jobName, setJobName] = useState('');
    const [jobDesc, setJobDesc] = useState('');
    const [uploadMode, setUploadMode] = useState<'pdf' | 'excel'>('pdf');
    const [files, setFiles] = useState<File[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

    // Sync jobName with context on mount
    useEffect(() => {
        if (ctxJobName && (analyzing || result)) {
            setJobName(ctxJobName);
        }
    }, [ctxJobName, analyzing, result]);

    // Local validation error (different from context error)
    const [formError, setFormError] = useState<string | null>(null);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = Array.from(e.dataTransfer.files);
        if (uploadMode === 'pdf') {
            const pdfs = dropped.filter(f => f.type === 'application/pdf');
            setFiles(prev => [...prev, ...pdfs].slice(0, 200));
        } else {
            const xlsx = dropped.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
            if (xlsx[0]) setFiles([xlsx[0]]);
        }
    }, [uploadMode]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const picked = Array.from(e.target.files);
        if (uploadMode === 'pdf') {
            setFiles(prev => [...prev, ...picked].slice(0, 200));
        } else {
            setFiles([picked[0]]);
        }
        e.target.value = '';
    };

    const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));

    const handleAnalyze = async () => {
        if (!jobName.trim()) { setFormError('Preencha o nome da vaga.'); return; }
        if (files.length === 0) { setFormError('Faça upload de pelo menos um arquivo.'); return; }
        setFormError(null);

        await startAnalysis(files, jobName, jobDesc, uploadMode);
    };

    // Show Results only if NOT analyzing and we HAVE a result
    if (!analyzing && result) {
        return <ResultsView result={result} jobName={jobName || ctxJobName || 'Análise'} onBack={() => clearAnalysis()} userId={profile.userId ?? ''} />;
    }

    // No longer returning a full-screen loader here, 
    // instead we handle the 'analyzing' state inside the main render below.

    return (
        <>

            {/* Main Content Container */}
            <div style={{
                maxWidth: 1200,
                margin: '0 auto',
                padding: '40px 24px 80px',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                {/* Page Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>
                            {analyzing ? 'Analisando currículos...' : (jobName || 'Nova Análise')}
                        </h1>
                    </div>
                    {analyzing && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ color: '#64748b', fontSize: 13, fontWeight: 500 }}>
                                {progress.current} / {progress.total} processados
                            </div>
                            <div style={{ width: 120, background: '#0d0f17', height: 6, borderRadius: 10, overflow: 'hidden' }}>
                                <div style={{ width: `${(progress.current / progress.total) * 100}%`, height: '100%', background: '#6366f1', transition: 'width 0.3s ease' }} />
                            </div>
                        </div>
                    )}
                    <button
                        onClick={clearAnalysis}
                        style={{
                            padding: '10px 24px', background: 'transparent', border: '1px solid #ef4444',
                            color: '#ef4444', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = '#ef4444';
                            e.currentTarget.style.color = '#fff';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#ef4444';
                        }}
                    >
                        Sair da análise
                    </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 32, alignItems: 'stretch' }}>

                    {/* Left Panel — Form Card */}
                    <div style={{
                        background: '#12141d',
                        border: '1px solid #1f2332',
                        borderRadius: 20,
                        overflow: 'hidden',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                    }}>

                        {/* Nome da Vaga */}
                        <div style={{ padding: '24px 24px 16px' }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 8 }}>Nome da Vaga</label>
                            <input
                                defaultValue={jobName}
                                onChange={e => setJobName(e.target.value)}
                                disabled={analyzing}
                                placeholder="Ex: Desenvolvedor Frontend React"
                                style={{
                                    width: '100%', background: '#0d0f17', border: '1px solid #1f2332', borderRadius: 10,
                                    padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none',
                                    transition: 'border 0.15s', boxSizing: 'border-box',
                                    opacity: analyzing ? 0.6 : 1, pointerEvents: analyzing ? 'none' : 'auto'
                                }}
                                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                                onBlur={e => (e.target.style.borderColor = '#1f2332')}
                            />
                        </div>

                        {/* Descrição da Vaga */}
                        <div style={{ padding: '0 24px 16px' }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 8 }}>Descrição da Vaga</label>
                            <textarea
                                defaultValue={jobDesc}
                                onChange={e => setJobDesc(e.target.value)}
                                disabled={analyzing}
                                placeholder="Descreva os requisitos e responsabilidades da vaga"
                                rows={12}
                                style={{
                                    width: '100%', background: '#0d0f17', border: '1px solid #1f2332', borderRadius: 10,
                                    padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none', resize: 'vertical',
                                    transition: 'border 0.15s', boxSizing: 'border-box', fontFamily: 'inherit',
                                    opacity: analyzing ? 0.6 : 1, pointerEvents: analyzing ? 'none' : 'auto'
                                }}
                                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                                onBlur={e => (e.target.style.borderColor = '#1f2332')}
                            />
                        </div>


                        {/* Divider */}
                        <div style={{ height: '1px', background: '#1f2332', margin: '0 24px' }} />

                        {/* Upload Section */}
                        <div style={{ padding: '16px 24px 24px' }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 12 }}>Upload de Currículos</label>

                            {/* Mode Tabs */}
                            <div style={{ display: 'flex', marginBottom: 16, background: '#0d0f17', borderRadius: 8, padding: 4 }}>
                                {(['pdf', 'excel'] as const).map(m => (
                                    <button
                                        key={m}
                                        onClick={() => { if (!analyzing) { setUploadMode(m); setFiles([]); } }}
                                        style={{
                                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                            padding: '8px 0', borderRadius: 6, border: 'none', cursor: analyzing ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500,
                                            background: uploadMode === m ? '#1a1c27' : 'transparent',
                                            color: uploadMode === m ? '#fff' : '#64748b',
                                            transition: 'all 0.15s',
                                            opacity: analyzing ? 0.5 : 1
                                        }}
                                    >
                                        {m === 'pdf' ? <FileText size={14} /> : <FileSpreadsheet size={14} />}
                                        {m === 'pdf' ? 'PDF' : 'Excel'}
                                    </button>
                                ))}
                            </div>

                            {/* Excel Instructions */}
                            {uploadMode === 'excel' && (
                                <div style={{ background: '#0d1020', border: '1px solid #2d3a6e', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#818cf8' }}>
                                            <FileSpreadsheet size={14} /> Excel Padronizado
                                        </span>
                                        <button style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#1a1c27', border: '1px solid #2d3147', borderRadius: 6, padding: '4px 10px', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}>
                                            <Download size={11} /> Baixar Exemplo
                                        </button>
                                    </div>
                                    <p style={{ fontSize: 12, color: '#64748b', marginBottom: 10, lineHeight: 1.5 }}>
                                        Use nosso modelo padronizado. Cada linha representa um candidato.
                                    </p>
                                    <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Colunas obrigatórias:</p>
                                    {EXCEL_TEMPLATE_COLS.map(c => (
                                        <p key={c.name} style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>
                                            <strong style={{ color: '#c7d2fe' }}>{c.name}</strong> – {c.desc}
                                        </p>
                                    ))}
                                </div>
                            )}

                            {/* File count */}
                            {uploadMode === 'pdf' && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>{files.length}/200 arquivos</span>
                                </div>
                            )}

                            {/* Drop Zone */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDrop={handleDrop}
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                style={{
                                    border: `2px dashed ${dragOver ? '#6366f1' : '#1f2332'}`,
                                    borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer',
                                    background: dragOver ? 'rgba(99,102,241,0.05)' : '#0d0f17',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <Upload size={28} style={{ color: '#64748b', marginBottom: 8 }} />
                                <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>
                                    Clique para fazer upload ou arraste os arquivos aqui
                                </p>
                                <p style={{ fontSize: 11, color: '#64748b' }}>
                                    {uploadMode === 'pdf' ? 'Aceita arquivos PDF (máx. 200 arquivos)' : 'Aceita apenas 1 arquivo Excel (.xlsx ou .xls)'}
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={uploadMode === 'pdf' ? 'application/pdf' : '.xlsx,.xls'}
                                    multiple={uploadMode === 'pdf'}
                                    onChange={handleFileInput}
                                    style={{ display: 'none' }}
                                />
                            </div>

                            {/* File list */}
                            {files.length > 0 && (
                                <div style={{ marginTop: 12, maxHeight: 150, overflowY: 'auto' }} className="custom-scrollbar">
                                    {files.map((f, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#0d0f17', borderRadius: 6, marginBottom: 4 }}>
                                            <span style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%' }}>{f.name}</span>
                                            <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2 }}><X size={12} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Error */}
                            {formError && (
                                <div style={{ marginTop: 24, padding: '12px 16px', background: '#ef444415', border: '1px solid #ef444433', borderRadius: 8, color: '#f87171', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <X size={14} /> {formError}
                                </div>
                            )}
                            {error && (
                                <div style={{
                                    marginTop: 24, padding: '12px 16px', background: '#ef444415', border: '1px solid #ef444433',
                                    borderRadius: 8, color: '#f87171', fontSize: 13, display: 'flex', alignItems: 'center',
                                    justifyContent: 'space-between', gap: 10
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <X size={14} /> {error}
                                    </div>
                                    <button
                                        onClick={() => setError(null)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 4, display: 'flex', alignItems: 'center' }}
                                        title="Fechar erro"
                                    >
                                        <XCircle size={16} />
                                    </button>
                                </div>
                            )}

                            {/* Analyze Button */}
                            <button
                                onClick={handleAnalyze}
                                disabled={analyzing}
                                style={{
                                    width: '100%', marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    gap: 8, padding: '12px 0', borderRadius: 10, border: 'none', cursor: analyzing ? 'not-allowed' : 'pointer',
                                    background: analyzing ? '#3730a3' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: '#fff', fontSize: 14, fontWeight: 600, transition: 'opacity 0.15s',
                                    opacity: analyzing ? 0.7 : 1,
                                }}
                            >
                                {analyzing ? (
                                    <><div style={{ width: 16, height: 16, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                        Analisando {progress.total > 0 ? `${progress.current} de ${progress.total}` : '...'}</>
                                ) : (
                                    <><Zap size={16} />Analisar</>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Right Panel — Processing or Placeholder */}
                    <div style={{
                        background: '#12141d',
                        border: '1px solid #1f2332',
                        borderRadius: 20,
                        padding: (analyzing || (result?.candidates?.length ?? 0) > 0) ? '0' : '48px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: (analyzing || (result?.candidates?.length ?? 0) > 0) ? 'stretch' : 'center',
                        justifyContent: (analyzing || (result?.candidates?.length ?? 0) > 0) ? 'flex-start' : 'center',
                        textAlign: 'center',
                        color: '#64748b',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                        minHeight: 600,
                        overflow: 'hidden'
                    }}>
                        {(analyzing || (result?.candidates?.length ?? 0) > 0) ? (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 800 }}>
                                <div style={{ padding: '24px', borderBottom: '1px solid #1f2332', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
                                    <div style={{ textAlign: 'left' }}>
                                        <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>Candidatos Processados</h3>
                                        <p style={{ fontSize: 12, margin: '4px 0 0', color: '#64748b' }}>
                                            {result?.candidates?.length || 0} currículos identificados
                                        </p>
                                    </div>
                                    {analyzing && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#818cf8', background: '#1a2350', padding: '6px 12px', borderRadius: 8, border: '1px solid #2d3a6e' }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#818cf8', animation: 'pulse 1.5s infinite' }} />
                                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>IA Ativa</span>
                                        </div>
                                    )}
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }} className="custom-scrollbar">
                                    {(result?.candidates || []).slice().reverse().map((c, idx) => (
                                        <div key={c.id} style={{
                                            background: '#0d0f17', border: '1px solid #1f2332', borderRadius: 14,
                                            padding: '16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14,
                                            animation: idx === 0 ? 'slideIn 0.4s ease-out' : 'none',
                                            transition: 'transform 0.2s',
                                            cursor: 'pointer'
                                        }}
                                            onMouseEnter={e => (e.currentTarget.style.transform = 'translateX(4px)')}
                                            onMouseLeave={e => (e.currentTarget.style.transform = 'translateX(0)')}
                                            onClick={() => setSelectedCandidate(c)}
                                        >
                                            <div style={{
                                                width: 44, height: 44, borderRadius: '50%',
                                                background: analyzing ? '#1a1c27' : `${scoreColor(c.score)}22`,
                                                color: analyzing ? '#4a5568' : scoreColor(c.score),
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 14, fontWeight: 800, flexShrink: 0,
                                                border: `1px solid ${analyzing ? '#1f2332' : scoreColor(c.score) + '33'}`
                                            }}>
                                                {analyzing ? <UserRound size={20} /> : `${c.score}%`}
                                            </div>
                                            <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                                                <p style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
                                                <p style={{ color: '#64748b', fontSize: 12, margin: '4px 0 0' }}>{c.gender ?? 'Gênero não informado'} • {c.location ?? 'Local não informado'}</p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {c.dbId && (
                                                    <div style={{ background: '#10b98122', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Check size={12} color="#10b981" strokeWidth={3} />
                                                    </div>
                                                )}
                                                <ChevronRight size={16} color="#1f2332" />
                                            </div>
                                        </div>
                                    ))}

                                    {analyzing && (
                                        <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                                            <div style={{ width: 32, height: 32, border: '3px solid #1f2332', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                                            <p style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>Lendo próximo currículo...</p>
                                            <p style={{ fontSize: 11, color: '#4a5568', marginTop: 8 }}>A IA está extraindo dados e calculando o score.</p>
                                        </div>
                                    )}
                                </div>
                                {analyzing && (
                                    <div style={{ padding: '20px 24px', borderTop: '1px solid #1f2332', background: 'rgba(99,102,241,0.03)', textAlign: 'left' }}>
                                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                            <Zap size={14} color="#818cf8" style={{ marginTop: 2 }} />
                                            <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: '1.5', margin: 0 }}>
                                                <strong>Dica:</strong> Você pode navegar pelo sistema ou fechar esta aba.
                                                A análise continua processando e salvará tudo automaticamente no banco de dados.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <Trophy size={56} style={{ color: '#1a1c27', marginBottom: 24 }} />
                                <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>Resultado da Análise</h3>
                                <p style={{ color: '#64748b', fontSize: 14, maxWidth: 320, lineHeight: 1.6, margin: 0 }}>
                                    Configure os parâmetros à esquerda, faça upload dos currículos e clique em "Analisar" para ver os resultados.
                                </p>
                            </>
                        )}
                    </div>

                </div>
            </div>

            {/* Candidate Detail Panel */}
            {selectedCandidate && (
                <CandidatePanel
                    candidate={selectedCandidate}
                    onClose={() => setSelectedCandidate(null)}
                />
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
                @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1f2332; border-radius: 10px; }
            `}</style>
        </>
    );
};

export default AnaliseNova;
