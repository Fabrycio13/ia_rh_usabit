import { useState } from 'react';
import { supabase } from '../../core/services/supabase';
import { ShieldCheck, Lock, Zap, Save, ChevronDown, ChevronUp, Check, Edit2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── TIPOS ──────────────────────────────────────────────────────────────────

export interface AdminUser {
    id: string;
    name?: string;
    email: string;
    user_role: string;
    status: string;
    account_type?: string;
    evo_url?: string;
    evo_key?: string;
    evo_instance?: string;
    organization_id?: string;
    organization_name?: string;
}

interface Plan {
    key: string;
    name: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    price: string;
    period: string;
    color: string;
    features: string[];
    popular?: boolean;
}

// ─── PANEL: API (Evolution) por admin ────────────────────────────────────────

export const OwnerAdminApiPanel = ({
    allUsers,
    labelStyle,
    fieldWrapStyle,
    iconFieldStyle,
    inputStyle,
    isMobile,
}: {
    allUsers: AdminUser[];
    labelStyle: React.CSSProperties;
    fieldWrapStyle: React.CSSProperties;
    iconFieldStyle: React.CSSProperties;
    inputStyle: React.CSSProperties;
    isMobile?: boolean;
}) => {
    const gestores = allUsers.filter(u => u.user_role === 'administrador');
    const [expanded, setExpanded] = useState<string | null>(null);
    const [configs, setConfigs] = useState<Record<string, { evo_url: string; evo_key: string; evo_instance: string }>>(() =>
        Object.fromEntries(gestores.map(a => [a.id, {
            evo_url: a.evo_url || '',
            evo_key: a.evo_key || '',
            evo_instance: a.evo_instance || '',
        }]))
    );
    const [saving, setSaving] = useState<string | null>(null);

    const handleSave = async (adminId: string) => {
        setSaving(adminId);
        const cfg = configs[adminId];
        const { error } = await supabase
            .from('profiles')
            .update({ evo_url: cfg.evo_url, evo_key: cfg.evo_key, evo_instance: cfg.evo_instance })
            .eq('id', adminId);
        setSaving(null);
        if (error) {
            toast.error('Erro ao salvar: ' + error.message);
        } else {
            toast.success('Configurações salvas!');
        }
    };

    if (gestores.length === 0) {
        return (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px 28px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Nenhum administrador cadastrado ainda.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ marginBottom: '8px' }}>
                <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '16px', margin: '0 0 4px' }}>
                    Configurações de API por Administrador
                </p>
                <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: 0 }}>
                    Visualize e edite as integrações Evolution API de cada cliente.
                </p>
            </div>

            {gestores.map(admin => {
                const cfg = configs[admin.id] ?? { evo_url: '', evo_key: '', evo_instance: '' };
                const isOpen = expanded === admin.id;
                const hasConfig = !!(admin.evo_url || admin.evo_key);
                const initials = (admin.name || admin.email).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                return (
                    <div key={admin.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', transition: 'all 0.2s' }}>
                        {/* Header do card */}
                        <button
                            onClick={() => setExpanded(isOpen ? null : admin.id)}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                        >
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                                {initials}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '14px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {admin.name || admin.email.split('@')[0]}
                                </p>
                                <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: '2px 0 0' }}>{admin.email}</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                <span style={{
                                    fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                                    background: hasConfig ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: hasConfig ? '#10b981' : '#ef4444',
                                    border: `1px solid ${hasConfig ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                }}>
                                    {hasConfig ? '✓ Configurado' : '⚠ Sem config'}
                                </span>
                                {isOpen ? <ChevronUp size={16} style={{ color: 'var(--text-dim)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-dim)' }} />}
                            </div>
                        </button>

                        {/* Conteúdo expandido */}
                        {isOpen && (
                            <div style={{ padding: isMobile ? '0 14px 14px' : '0 20px 20px', borderTop: '1px solid var(--border)' }}>
                                <div style={{ paddingTop: '16px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1.5fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={labelStyle}>Server URL</label>
                                        <div style={fieldWrapStyle}>
                                            <ShieldCheck style={iconFieldStyle} />
                                            <input
                                                className="field-input"
                                                style={inputStyle}
                                                placeholder="https://evolution.servidor.com"
                                                value={cfg.evo_url}
                                                onChange={e => setConfigs(prev => ({ ...prev, [admin.id]: { ...prev[admin.id], evo_url: e.target.value } }))}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>API Key</label>
                                        <div style={fieldWrapStyle}>
                                            <Lock style={iconFieldStyle} />
                                            <input
                                                className="field-input"
                                                type="password"
                                                style={inputStyle}
                                                placeholder="Global API Key"
                                                value={cfg.evo_key}
                                                onChange={e => setConfigs(prev => ({ ...prev, [admin.id]: { ...prev[admin.id], evo_key: e.target.value } }))}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Instância</label>
                                        <div style={fieldWrapStyle}>
                                            <Zap style={iconFieldStyle} />
                                            <input
                                                className="field-input"
                                                style={inputStyle}
                                                placeholder="agente-rh"
                                                value={cfg.evo_instance}
                                                onChange={e => setConfigs(prev => ({ ...prev, [admin.id]: { ...prev[admin.id], evo_instance: e.target.value } }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => handleSave(admin.id)}
                                        disabled={saving === admin.id}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: saving === admin.id ? 'not-allowed' : 'pointer', opacity: saving === admin.id ? 0.7 : 1 }}
                                    >
                                        {saving === admin.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                                        {saving === admin.id ? 'Salvando...' : 'Salvar'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ─── PANEL: PLANO por admin ──────────────────────────────────────────────────

const planColors: Record<string, string> = {
    trial: '#f59e0b',
    pro: '#6366f1',
    enterprise: '#10b981',
    lifetime: '#dc2626',
};

const planLabels: Record<string, string> = {
    trial: 'Trial',
    pro: 'Pro',
    enterprise: 'Enterprise',
    lifetime: 'Lifetime',
    active: 'Ativo',
};

export const OwnerAdminPlanPanel = ({
    allUsers,
    isMobile,
}: {
    allUsers: AdminUser[];
    plans?: Plan[];
    isMobile?: boolean;
}) => {
    const gestores = allUsers.filter(u => u.user_role === 'administrador');
    const [editing, setEditing] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState<string | null>(null);

    const handleEdit = (admin: AdminUser) => {
        setEditing(admin.id);
        setSelectedPlan(prev => ({ ...prev, [admin.id]: admin.account_type || 'trial' }));
    };

    const handleSave = async (adminId: string) => {
        setSaving(adminId);
        const plan = selectedPlan[adminId];
        const isPremium = plan !== 'trial';
        const { error } = await supabase
            .from('profiles')
            .update({ account_type: plan, plan: plan, is_premium: isPremium })
            .eq('id', adminId);
        setSaving(null);
        if (error) {
            toast.error('Erro ao salvar: ' + error.message);
        } else {
            toast.success('Plano atualizado!');
            setEditing(null);
        }
    };

    if (gestores.length === 0) {
        return (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '40px 28px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Nenhum administrador cadastrado ainda.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ marginBottom: '8px' }}>
                <p style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '16px', margin: '0 0 4px' }}>
                    Planos por Administrador
                </p>
                <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: 0 }}>
                    Visualize e altere o plano de cada cliente. Você pode fazer upgrade ou downgrade manually.
                </p>
            </div>

            {/* Tabela de administradores */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'auto' }}>
                <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '14px 20px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>Administrador</th>
                            <th style={{ padding: '14px 20px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Plano Atual</th>
                            <th style={{ padding: '14px 20px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Status</th>
                            <th style={{ padding: '14px 20px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {gestores.map(admin => {
                            const currentPlan = admin.account_type || 'trial';
                            const planColor = planColors[currentPlan] || '#6366f1';
                            const initials = (admin.name || admin.email).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                            const isEditingThis = editing === admin.id;

                            return (
                                <tr key={admin.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    {/* Admin info */}
                                    <td style={{ padding: '14px 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                                                {initials}
                                            </div>
                                            <div>
                                                <p style={{ color: 'var(--text-main)', fontWeight: 500, fontSize: '13px', margin: 0 }}>
                                                    {admin.name || admin.email.split('@')[0]}
                                                </p>
                                                <p style={{ color: 'var(--text-dim)', fontSize: '11px', margin: '2px 0 0' }}>{admin.email}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Plano */}
                                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                        {isEditingThis ? (
                                            <select
                                                value={selectedPlan[admin.id] || currentPlan}
                                                onChange={e => setSelectedPlan(prev => ({ ...prev, [admin.id]: e.target.value }))}
                                                style={{ background: 'var(--bg-input)', border: `1px solid ${planColor}40`, borderRadius: '8px', padding: '6px 12px', color: planColor, fontSize: '12px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                                            >
                                                <option value="trial">Trial</option>
                                                <option value="pro">Pro</option>
                                                <option value="enterprise">Enterprise</option>
                                                <option value="lifetime">Lifetime</option>
                                            </select>
                                        ) : (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: `${planColor}15`, color: planColor, fontSize: '12px', fontWeight: 700, border: `1px solid ${planColor}30` }}>
                                                {planLabels[currentPlan] || currentPlan}
                                            </span>
                                        )}
                                    </td>

                                    {/* Status */}
                                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: admin.status === 'active' ? '#10b981' : '#ef4444' }} />
                                            <span style={{ fontSize: '12px', color: admin.status === 'active' ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                                                {admin.status === 'active' ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Ações */}
                                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                        {isEditingThis ? (
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => handleSave(admin.id)}
                                                    disabled={saving === admin.id}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                                >
                                                    {saving === admin.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={12} />}
                                                    Salvar
                                                </button>
                                                <button
                                                    onClick={() => setEditing(null)}
                                                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-dim)', fontSize: '12px', cursor: 'pointer' }}
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleEdit(admin)}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                <Edit2 size={12} />
                                                Editar Plano
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                </div>
            </div>

            {/* Legenda dos planos */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px', marginTop: '4px' }}>
                {([['trial', '#f59e0b', 'Grátis – 7 dias'], ['pro', '#6366f1', 'R$ 99,90/mês'], ['enterprise', '#10b981', 'Sob consulta'], ['lifetime', '#dc2626', 'Acesso vitalício']] as const).map(([key, color, desc]) => (
                    <div key={key} style={{ padding: '12px 14px', borderRadius: '10px', background: `${color}08`, border: `1px solid ${color}20` }}>
                        <p style={{ color: color, fontWeight: 700, fontSize: '12px', margin: '0 0 2px', textTransform: 'capitalize' }}>{planLabels[key]}</p>
                        <p style={{ color: 'var(--text-dim)', fontSize: '11px', margin: 0 }}>{desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
