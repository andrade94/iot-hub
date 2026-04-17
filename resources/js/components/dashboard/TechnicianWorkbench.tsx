import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { useLang } from '@/hooks/use-lang';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    Camera,
    CheckCircle2,
    Clock,
    MapPin,
    MessageSquare,
    Play,
} from 'lucide-react';

interface MyWorkOrder {
    id: number;
    title: string;
    description: string | null;
    type: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: string;
    site_name: string | null;
    site_address: string | null;
    device_state: {
        name: string;
        model: string;
        status: string;
        battery_pct: number | null;
        last_reading_at: string | null;
        last_reading_ago: string | null;
        is_reporting: boolean;
    } | null;
    is_overdue: boolean;
    created_at: string | null;
    created_ago: string | null;
}

interface TechStats {
    overdue: number;
    assigned: number;
    in_progress: number;
    completed_this_month: number;
}

interface RecentAlert {
    id: number;
    severity: string;
    rule_name: string;
    zone: string | null;
    site_name: string | null;
    triggered_ago: string;
}

interface Props {
    myWorkOrders: MyWorkOrder[];
    techStats: TechStats;
    recentAlerts: RecentAlert[];
}

export function TechnicianWorkbench({ myWorkOrders, techStats, recentAlerts }: Props) {
    const { t } = useLang();
    const { auth } = usePage<SharedData>().props;
    const userName = auth.user?.name?.split(' ')[0] ?? '';

    const totalActive = techStats.overdue + techStats.assigned + techStats.in_progress;

    return (
        <div className="mx-auto flex max-w-[1000px] flex-col gap-5">
            {/* Hero */}
            <FadeIn direction="down" duration={400}>
                <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                    <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                    <div className="relative p-6 md:p-8">
                        <p className="font-mono text-[0.625rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('Good morning')}, {userName}
                        </p>
                        <h1 className="font-display mt-1.5 text-[1.75rem] font-bold tracking-tight">
                            {t('My work orders')}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            <strong>{totalActive} {t('OTs')}</strong> {t('assigned to you')}
                            {techStats.in_progress > 0 && <> · {techStats.in_progress} {t('in progress')}</>}
                            {techStats.overdue > 0 && <> · <span className="text-rose-500">{techStats.overdue} {t('overdue SLA')}</span></>}
                        </p>
                    </div>
                </div>
            </FadeIn>

            {/* Summary pills */}
            <FadeIn delay={50} duration={400}>
                <div className="grid grid-cols-4 gap-3">
                    <SummaryPill value={techStats.overdue} label={t('SLA overdue')} tone={techStats.overdue > 0 ? 'coral' : 'default'} />
                    <SummaryPill value={techStats.assigned} label={t('Assigned')} tone={techStats.assigned > 0 ? 'amber' : 'default'} />
                    <SummaryPill value={techStats.in_progress} label={t('In Progress')} tone="cyan" />
                    <SummaryPill value={techStats.completed_this_month} label={t('this month')} tone="emerald" />
                </div>
            </FadeIn>

            {/* My WOs */}
            <FadeIn delay={100} duration={400}>
                <Card className="shadow-elevation-1">
                    <CardContent className="p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="font-display text-base font-semibold">{t('My active WOs')}</p>
                                <p className="text-xs text-muted-foreground">{t('Sorted by urgency — overdue first')}</p>
                            </div>
                            <Link href="/work-orders" className="font-mono text-[10px] text-primary hover:text-primary/80">{t('VIEW ALL')} →</Link>
                        </div>
                        {myWorkOrders.length === 0 ? (
                            <div className="py-8 text-center">
                                <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-500" />
                                <p className="font-medium">{t('All caught up')}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{t('No work orders assigned to you')}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {myWorkOrders.map((wo) => (
                                    <WoCard key={wo.id} wo={wo} t={t} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </FadeIn>

            {/* Alerts */}
            {recentAlerts.length > 0 && (
                <FadeIn delay={150} duration={400}>
                    <Card className="shadow-elevation-1">
                        <CardContent className="p-5">
                            <p className="mb-3 font-display text-base font-semibold">{t('Alerts in my sites')}</p>
                            <div className="space-y-1.5">
                                {recentAlerts.slice(0, 5).map((alert) => (
                                    <Link
                                        key={alert.id}
                                        href={`/alerts/${alert.id}`}
                                        className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 p-2.5 text-xs transition-colors hover:bg-muted/30"
                                    >
                                        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full',
                                            alert.severity === 'critical' && 'bg-rose-500',
                                            alert.severity === 'high' && 'bg-amber-500',
                                            alert.severity === 'medium' && 'bg-cyan-500',
                                        )} />
                                        <span className="flex-1 truncate text-muted-foreground">
                                            {alert.rule_name} · {alert.site_name}
                                        </span>
                                        <span className="shrink-0 font-mono text-[9px] text-muted-foreground/60">{alert.triggered_ago}</span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                router.post(`/alerts/${alert.id}/acknowledge`, {}, { preserveScroll: true });
                                            }}
                                            className="shrink-0 rounded border border-border px-2 py-0.5 font-mono text-[9px] text-muted-foreground hover:border-emerald-500 hover:text-emerald-500"
                                        >
                                            ACK
                                        </button>
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>
            )}
        </div>
    );
}

function SummaryPill({ value, label, tone = 'default' }: { value: number; label: string; tone?: 'coral' | 'amber' | 'cyan' | 'emerald' | 'default' }) {
    const valueClass = {
        coral: 'text-rose-500',
        amber: 'text-amber-500',
        cyan: 'text-cyan-500',
        emerald: 'text-emerald-500',
        default: 'text-foreground',
    }[tone];

    return (
        <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className={cn('font-display text-2xl font-bold tabular-nums', valueClass)}>{value}</p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
        </div>
    );
}

function WoCard({ wo, t }: { wo: MyWorkOrder; t: (k: string) => string }) {
    const priorityStyle = {
        urgent: 'bg-rose-500/15 text-rose-500',
        high: 'bg-amber-500/15 text-amber-500',
        medium: 'bg-cyan-500/15 text-cyan-500',
        low: 'bg-muted text-muted-foreground',
    }[wo.priority];

    const borderClass = wo.is_overdue
        ? 'border-l-[4px] border-l-rose-500'
        : wo.status === 'in_progress'
          ? 'border-l-[4px] border-l-cyan-500'
          : 'border-l-[4px] border-l-amber-500';

    return (
        <div className={cn('rounded-lg border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/30', borderClass)}>
            <div className="flex items-start justify-between gap-3">
                <p className="text-[15px] font-semibold">{wo.title}</p>
                <div className="flex shrink-0 gap-1.5">
                    <span className={cn('rounded px-2 py-0.5 font-mono text-[8px] font-bold uppercase', priorityStyle)}>
                        {t(wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1))}
                    </span>
                    {wo.is_overdue && (
                        <span className="rounded bg-rose-500/15 px-2 py-0.5 font-mono text-[8px] font-bold uppercase text-rose-500">
                            {t('SLA overdue')}
                        </span>
                    )}
                </div>
            </div>

            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {wo.site_name} · {wo.created_ago}
            </p>
            {wo.site_address && (
                <p className="mt-0.5 font-mono text-[9px] text-muted-foreground/60">
                    <MapPin className="mr-1 inline h-2.5 w-2.5" />{wo.site_address}
                </p>
            )}

            {/* Device state hint */}
            {wo.device_state && (
                <div className={cn(
                    'mt-2 inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[10px]',
                    !wo.device_state.is_reporting ? 'bg-rose-500/10 text-rose-500' :
                    (wo.device_state.battery_pct !== null && wo.device_state.battery_pct < 20) ? 'bg-rose-500/10 text-rose-500' :
                    'bg-amber-500/10 text-amber-500',
                )}>
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {!wo.device_state.is_reporting
                        ? `${t('No readings since')} ${wo.device_state.last_reading_ago ?? '—'}`
                        : wo.device_state.battery_pct !== null && wo.device_state.battery_pct < 20
                          ? `${t('Battery')}: ${wo.device_state.battery_pct}%`
                          : `${wo.device_state.model} · ${t('reporting')}`
                    }
                </div>
            )}

            {wo.description && (
                <p className="mt-2 border-t border-border/40 pt-2 text-[12px] leading-relaxed text-muted-foreground">
                    {wo.description}
                </p>
            )}

            {/* Actions */}
            <div className="mt-3 flex gap-2">
                {(wo.status === 'open' || wo.status === 'assigned') && (
                    <Button size="sm" className="h-7 gap-1.5 text-[11px]" onClick={() => router.put(`/work-orders/${wo.id}/status`, { status: 'in_progress' }, { preserveScroll: true })}>
                        <Play className="h-3 w-3" /> {t('Start')}
                    </Button>
                )}
                {wo.status === 'in_progress' && (
                    <Button size="sm" className="h-7 gap-1.5 bg-emerald-600 text-[11px] text-white hover:bg-emerald-700" onClick={() => router.get(`/work-orders/${wo.id}`)}>
                        <CheckCircle2 className="h-3 w-3" /> {t('Complete')}
                    </Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-[11px] text-muted-foreground" onClick={() => router.get(`/work-orders/${wo.id}`)}>
                    <MessageSquare className="h-3 w-3" /> {t('Notes')}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-[11px] text-muted-foreground" onClick={() => router.get(`/work-orders/${wo.id}`)}>
                    <Camera className="h-3 w-3" /> {t('Photos')}
                </Button>
            </div>
        </div>
    );
}
