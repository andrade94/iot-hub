import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    description?: string;
    icon?: LucideIcon;
}

function FormSection({ title, description, icon: Icon, className, children, ...props }: FormSectionProps) {
    return (
        <Card className={cn(className)} {...props}>
            <CardHeader>
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Icon className="size-4 text-muted-foreground" />
                        </div>
                    )}
                    <div>
                        <CardTitle className="text-base">{title}</CardTitle>
                        {description && <CardDescription>{description}</CardDescription>}
                    </div>
                </div>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

export { FormSection };
export type { FormSectionProps };
