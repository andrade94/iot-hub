import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface DetailItem {
    label: string;
    value: React.ReactNode;
}

interface DetailCardProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
    items: DetailItem[];
}

/**
 * A card displaying a list of label-value pairs separated by lines.
 * Used on Show/Detail pages for info sidebars.
 *
 * @example
 * <DetailCard
 *     title="Details"
 *     items={[
 *         { label: 'Category', value: <Badge>Clothing</Badge> },
 *         { label: 'Status', value: 'Active' },
 *         { label: 'SKU', value: <code>SKU-123</code> },
 *     ]}
 * />
 */
function DetailCard({ title, items, className, ...props }: DetailCardProps) {
    return (
        <Card className={cn(className)} {...props}>
            {title && (
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                </CardHeader>
            )}
            <CardContent className={cn(!title && 'pt-6')}>
                <div className="space-y-3">
                    {items.map((item, i) => (
                        <div key={item.label}>
                            {i > 0 && <Separator className="mb-3" />}
                            <div className="flex items-center justify-between gap-4">
                                <span className="shrink-0 text-sm text-muted-foreground">
                                    {item.label}
                                </span>
                                <span className="text-right text-sm font-medium">
                                    {item.value}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

/**
 * A card showing a single large metric value.
 * Used on Show pages for price, stock, totals, etc.
 *
 * @example
 * <MetricCard label="Price" value="$299.99" />
 * <MetricCard label="Inventory" value={42} suffix="units" badge="In Stock" badgeColor="text-emerald-600" />
 */
interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
    label: string;
    value: React.ReactNode;
    suffix?: string;
    badge?: string;
    badgeColor?: string;
}

function MetricCard({ label, value, suffix, badge, badgeColor, className, ...props }: MetricCardProps) {
    return (
        <Card className={cn(className)} {...props}>
            <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    {badge && (
                        <span className={cn('text-sm font-medium', badgeColor)}>
                            {badge}
                        </span>
                    )}
                </div>
                <p className="mt-1 text-3xl font-bold tracking-tight">
                    {value}
                    {suffix && (
                        <span className="ml-1.5 text-base font-normal text-muted-foreground">
                            {suffix}
                        </span>
                    )}
                </p>
            </CardContent>
        </Card>
    );
}

export { DetailCard, MetricCard };
export type { DetailCardProps, DetailItem, MetricCardProps };
