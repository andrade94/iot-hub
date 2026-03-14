import * as React from 'react';
import { Check, Circle } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const stepperVariants = cva('flex w-full', {
    variants: {
        orientation: {
            horizontal: 'flex-row items-center',
            vertical: 'flex-col',
        },
    },
    defaultVariants: {
        orientation: 'horizontal',
    },
});

const stepVariants = cva(
    'relative flex items-center transition-all duration-300',
    {
        variants: {
            orientation: {
                horizontal: 'flex-1',
                vertical: 'pb-8 last:pb-0',
            },
            status: {
                completed: '',
                current: '',
                upcoming: 'opacity-60',
            },
        },
        defaultVariants: {
            orientation: 'horizontal',
            status: 'upcoming',
        },
    }
);

interface Step {
    id: string | number;
    title: string;
    description?: string;
    icon?: React.ReactNode;
}

interface StepperContextValue {
    currentStep: number;
    orientation: 'horizontal' | 'vertical';
    steps: Step[];
}

const StepperContext = React.createContext<StepperContextValue | undefined>(undefined);

function useStepperContext() {
    const context = React.useContext(StepperContext);
    if (!context) {
        throw new Error('Stepper components must be used within a Stepper');
    }
    return context;
}

interface StepperProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof stepperVariants> {
    currentStep: number;
    steps: Step[];
}

function Stepper({
    className,
    orientation = 'horizontal',
    currentStep,
    steps,
    children,
    ...props
}: StepperProps) {
    return (
        <StepperContext.Provider value={{ currentStep, orientation: orientation ?? 'horizontal', steps }}>
            <div
                className={cn(stepperVariants({ orientation }), className)}
                role="list"
                aria-label="Progress steps"
                {...props}
            >
                {steps.map((step, index) => (
                    <StepperStep key={step.id} step={step} index={index} />
                ))}
            </div>
        </StepperContext.Provider>
    );
}

interface StepperStepProps {
    step: Step;
    index: number;
}

function StepperStep({ step, index }: StepperStepProps) {
    const { currentStep, orientation, steps } = useStepperContext();
    const isCompleted = index < currentStep;
    const isCurrent = index === currentStep;
    const isLast = index === steps.length - 1;

    const status = isCompleted ? 'completed' : isCurrent ? 'current' : 'upcoming';

    return (
        <div
            className={cn(stepVariants({ orientation, status }))}
            role="listitem"
            aria-current={isCurrent ? 'step' : undefined}
        >
            {/* Step indicator */}
            <div className="flex items-center">
                <div
                    className={cn(
                        'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300',
                        isCompleted && 'border-primary bg-primary text-primary-foreground',
                        isCurrent && 'border-primary bg-background text-primary ring-4 ring-primary/20',
                        !isCompleted && !isCurrent && 'border-muted-foreground/30 bg-background text-muted-foreground'
                    )}
                >
                    {isCompleted ? (
                        <Check className="h-5 w-5" />
                    ) : step.icon ? (
                        step.icon
                    ) : (
                        <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                </div>

                {/* Connector line */}
                {!isLast && orientation === 'horizontal' && (
                    <div
                        className={cn(
                            'h-0.5 flex-1 transition-all duration-500',
                            isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'
                        )}
                    />
                )}
            </div>

            {/* Vertical connector */}
            {!isLast && orientation === 'vertical' && (
                <div
                    className={cn(
                        'absolute left-5 top-10 h-full w-0.5 -translate-x-1/2 transition-all duration-500',
                        isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'
                    )}
                />
            )}

            {/* Step content */}
            <div
                className={cn(
                    'mt-2',
                    orientation === 'horizontal' && 'absolute top-12 left-0 w-full text-center',
                    orientation === 'vertical' && 'ml-4 mt-0'
                )}
            >
                <p
                    className={cn(
                        'text-sm font-medium transition-colors',
                        (isCompleted || isCurrent) && 'text-foreground',
                        !isCompleted && !isCurrent && 'text-muted-foreground'
                    )}
                >
                    {step.title}
                </p>
                {step.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                )}
            </div>
        </div>
    );
}

export { Stepper, type Step };
