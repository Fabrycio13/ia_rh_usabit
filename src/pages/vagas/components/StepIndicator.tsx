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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', position: 'relative' }}>
            {/* Progress Line */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '40px',
                right: '40px',
                height: '2px',
                background: 'var(--border)',
                zIndex: 0
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
                            flex: 1
                        }}
                    >
                        {/* Circle */}
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: isCompleted ? 'var(--primary)' : isCurrent ? 'var(--bg-card)' : 'var(--bg-main)',
                            border: isCurrent ? '2px solid var(--primary)' : '2px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '8px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}>
                            {isCompleted ? (
                                <Check size={18} style={{ color: '#fff' }} />
                            ) : (
                                <span style={{
                                    color: isCurrent ? 'var(--primary)' : 'var(--text-muted)',
                                    fontSize: '14px',
                                    fontWeight: 700
                                }}>
                                    {step.number}
                                </span>
                            )}
                        </div>

                        {/* Label */}
                        <p style={{
                            color: isCurrent ? 'var(--text-main)' : 'var(--text-muted)',
                            fontSize: '12px',
                            fontWeight: isCurrent ? 600 : 500,
                            margin: 0,
                            textAlign: 'center',
                            maxWidth: '100px'
                        }}>
                            {step.title}
                        </p>
                    </div>
                );
            })}
        </div>
    );
};
