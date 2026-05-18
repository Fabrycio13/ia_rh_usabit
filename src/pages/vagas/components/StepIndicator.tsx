import { Check } from 'lucide-react';

interface Step {
    number: number;
    title: string;
    description?: string;
}

interface StepIndicatorProps {
    steps: Step[];
    currentStep: number;
    onStepClick?: (step: number) => void;
}

export const StepIndicator = ({ steps, currentStep, onStepClick }: StepIndicatorProps) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', position: 'relative', width: '100%' }}>
            <style>{`
                @keyframes stepPulse {
                    0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
                }
            `}</style>

            {/* Progress Line Container */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '0',
                right: '0',
                height: '2px',
                background: 'var(--border)',
                zIndex: 0,
                margin: '0 40px'
            }}>
                <div style={{
                    height: '100%',
                    width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
                    background: 'var(--primary)',
                    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
            </div>

            {/* Steps */}
            {steps.map((step, index) => {
                const isCompleted = index + 1 < currentStep;
                const isCurrent = index + 1 === currentStep;
                const isClickable = onStepClick !== undefined;

                return (
                    <div
                        key={step.number}
                        onClick={() => isClickable && index + 1 < currentStep && onStepClick(step.number)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            zIndex: 1,
                            cursor: isClickable && index + 1 < currentStep ? 'pointer' : 'default',
                            width: '80px', // Fixed width for each step container
                            position: 'relative'
                        }}
                    >
                        {/* Circle */}
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: (isCompleted || isCurrent) ? 'var(--primary)' : 'var(--bg-main)',
                            border: isCurrent ? '2px solid var(--primary)' : '2px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '10px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            animation: isCurrent ? 'stepPulse 2s infinite' : 'none',
                            boxShadow: isCurrent ? '0 0 15px rgba(99, 102, 241, 0.5)' : 'none',
                            position: 'relative',
                            zIndex: 2
                        }}>
                            {isCompleted ? (
                                <Check size={20} strokeWidth={3} style={{ color: '#fff' }} />
                            ) : (
                                <span style={{
                                    color: isCurrent ? '#fff' : 'var(--text-muted)',
                                    fontSize: '15px',
                                    fontWeight: 800,
                                    lineHeight: 1,
                                    display: 'block'
                                }}>
                                    {step.number}
                                </span>
                            )}
                        </div>

                        {/* Label */}
                        <p style={{
                            color: isCurrent ? 'var(--text-main)' : 'var(--text-muted)',
                            fontSize: '13px',
                            fontWeight: isCurrent ? 700 : 500,
                            margin: 0,
                            textAlign: 'center',
                            whiteSpace: 'nowrap'
                        }}>
                            {step.title}
                        </p>
                    </div>
                );
            })}
        </div>
    );
};
