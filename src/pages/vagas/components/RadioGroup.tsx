import type { ReactNode } from 'react';

interface RadioOption {
    value: string;
    label: string;
    icon?: ReactNode;
    description?: string;
}

interface RadioGroupProps {
    label: string;
    options: RadioOption[];
    value: string;
    onChange: (value: string) => void;
    columns?: 2 | 3 | 4;
    mobileColumns?: 1 | 2;
}

export const RadioGroup = ({ label, options, value, onChange, columns = 3, mobileColumns }: RadioGroupProps) => {
    const getGridColumns = () => {
        const cols = mobileColumns ?? columns;
        switch (cols) {
            case 1: return '1fr';
            case 2: return '1fr 1fr';
            case 3: return '1fr 1fr 1fr';
            case 4: return '1fr 1fr 1fr 1fr';
        }
    };

    return (
        <div>
            <p style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>{label}</p>
            <div style={{ display: 'grid', gridTemplateColumns: getGridColumns(), gap: '12px' }}>
                {options.map((option) => {
                    const isSelected = value === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onChange(option.value)}
                            style={{
                                padding: '16px',
                                background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-main)',
                                border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                boxShadow: isSelected ? '0 0 0 1px var(--primary)' : 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                textAlign: 'center',
                                position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.borderColor = 'var(--primary)';
                                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isSelected) {
                                    e.currentTarget.style.borderColor = 'var(--border)';
                                    e.currentTarget.style.background = 'var(--bg-main)';
                                }
                            }}
                        >
                            {option.icon && (
                                <div style={{ marginBottom: '8px', color: isSelected ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', justifyContent: 'center' }}>
                                    {option.icon}
                                </div>
                            )}
                            <p style={{ color: isSelected ? 'var(--primary)' : 'var(--text-main)', fontSize: '14px', fontWeight: 600, margin: 0 }}>
                                {option.label}
                            </p>
                            {option.description && (
                                <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '4px 0 0' }}>{option.description}</p>
                            )}
                            {isSelected && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-6px',
                                    right: '-6px',
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    background: 'var(--primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)'
                                }}>
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                        <path d="M2 5L4.5 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
