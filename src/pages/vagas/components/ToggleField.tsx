import { Check, X } from 'lucide-react';

interface ToggleFieldProps {
    label: string;
    description?: string;
    value: boolean;
    onChange: (value: boolean) => void;
}

export const ToggleField = ({ label, description, value, onChange }: ToggleFieldProps) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-main)', borderRadius: '10px', border: '1px solid var(--border)', transition: 'all 0.2s' }}>
            <div style={{ flex: 1 }}>
                <p style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 600, margin: 0 }}>{label}</p>
                {description && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0' }}>{description}</p>
                )}
            </div>
            <button
                type="button"
                onClick={() => onChange(!value)}
                style={{
                    width: '56px',
                    height: '30px',
                    borderRadius: '15px',
                    border: 'none',
                    background: value ? 'var(--primary)' : 'var(--border)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    flexShrink: 0
                }}
            >
                <div style={{
                    position: 'absolute',
                    top: '3px',
                    left: value ? '28px' : '3px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                    {value ? (
                        <Check size={14} style={{ color: 'var(--primary)' }} />
                    ) : (
                        <X size={14} style={{ color: 'var(--border)' }} />
                    )}
                </div>
            </button>
        </div>
    );
};
