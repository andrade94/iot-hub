import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, MorningSummary, MorningSummaryZone, Site } from '@/types';
import { Head } from '@inertiajs/react';
import { AlertTriangle, BatteryLow, CheckCircle2, Cpu, Signal, WifiOff } from 'lucide-react';

interface Props {
    site: Site;
    summary: MorningSummary;
}

export default function SummaryReport({ site, summary }: Props) {
    const { t } = useLang();
    const breadcrumbs: BreadcrumbItem[] = [
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Morning Summary', href: '#' },
    ];

    const d = summary.devices;
    const healthPct = d.total > 0 ? Math.round((d.online / d.total) * 100) : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Morning Summary')} \u2014 ${site.name}`} />
            <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative p-6 text-center md:p-8">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Morning Summary')}
                            </p>
                            <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                {site.name}
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {new Date(summary.generated_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Fleet Health ─────────────────────────────────── */}
                <FadeIn delay={75} duration={400}>
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Fleet Health')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <Card className="shadow-elevation-1">
                            <CardContent className="p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <span className="text-sm font-medium">{t('Fleet Health')}</span>
                                    <span className="font-mono text-2xl font-bold tabular-nums">{healthPct}%</span>
                                </div>
                                <Progress
                                    value={healthPct}
                                    size="lg"
                                    variant={healthPct > 80 ? 'success' : healthPct > 50 ? 'warning' : 'destructive'}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </FadeIn>

                {/* ── Device Stats ─────────────────────────────────── */}
                <FadeIn delay={150} duration={500}>
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Devices')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <SummaryCard icon={<Cpu className="h-5 w-5" />} label={t('Total')} value={d.total} />
                            <SummaryCard icon={<Signal className="h-5 w-5 text-emerald-500" />} label={t('Online')} value={d.online} accent="emerald" />
                            <SummaryCard icon={<WifiOff className="h-5 w-5 text-red-500" />} label={t('Offline')} value={d.offline} accent={d.offline > 0 ? 'red' : undefined} />
                            <SummaryCard icon={<BatteryLow className="h-5 w-5 text-amber-500" />} label={t('Low Battery')} value={d.low_battery} accent={d.low_battery > 0 ? 'amber' : undefined} />
                        </div>
                    </div>
                </FadeIn>

                {/* ── Alerts ───────────────────────────────────────── */}
                <FadeIn delay={225} duration={500}>
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Alerts')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Card className="shadow-elevation-1">
                                <CardContent className="flex items-center gap-3 p-4">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    <div>
                                        <p className="font-mono text-2xl font-bold tabular-nums">{summary.alerts_24h}</p>
                                        <p className="text-xs text-muted-foreground">{t('Alerts (24h)')}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="shadow-elevation-1">
                                <CardContent className="flex items-center gap-3 p-4">
                                    {summary.active_alerts > 0 ? (
                                        <AlertTriangle className="h-5 w-5 text-red-500" />
                                    ) : (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    )}
                                    <div>
                                        <p className="font-mono text-2xl font-bold tabular-nums">{summary.active_alerts}</p>
                                        <p className="text-xs text-muted-foreground">{t('Active Now')}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Zone Status ──────────────────────────────────── */}
                <FadeIn delay={300} duration={500}>
                    <div>
                        <div className="mb-2 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Zone Status')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {summary.zones.map((zone, idx) => (
                                <FadeIn key={zone.name} delay={350 + idx * 50} duration={400}>
                                    <ZoneStatusCard zone={zone} />
                                </FadeIn>
                            ))}
                        </div>
                    </div>
                </FadeIn>
            </div>
        </AppLayout>
    );
}

export function MorningSummarySkeleton() {
    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 text-center md:p-8">
                <Skeleton className="mx-auto h-3 w-28" />
                <Skeleton className="mx-auto mt-3 h-8 w-40" />
                <Skeleton className="mx-auto mt-2 h-4 w-24" />
            </div>
            {/* Fleet Health */}
            <div>
                <div className="mb-2 flex items-center gap-3">
                    <Skeleton className="h-3 w-20" />
                    <div className="h-px flex-1 bg-border" />
                </div>
                <div className="rounded-xl border p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-7 w-12" />
                    </div>
                    <Skeleton className="h-3 w-full rounded-full" />
                </div>
            </div>
            {/* Device Stats */}
            <div>
                <div className="mb-2 flex items-center gap-3">
                    <Skeleton className="h-3 w-16" />
                    <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-xl border p-4 text-center">
                            <Skeleton className="mx-auto h-5 w-5" />
                            <Skeleton className="mx-auto mt-2 h-7 w-10" />
                            <Skeleton className="mx-auto mt-1 h-3 w-16" />
                        </div>
                    ))}
                </div>
            </div>
            {/* Alerts */}
            <div>
                <div className="mb-2 flex items-center gap-3">
                    <Skeleton className="h-3 w-12" />
                    <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="rounded-xl border p-4">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-5 w-5" />
                                <div>
                                    <Skeleton className="h-7 w-10" />
                                    <Skeleton className="mt-1 h-3 w-20" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SummaryCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: string }) {
    return (
        <Card className="shadow-elevation-1">
            <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                {icon}
                <p className={`font-mono text-2xl font-bold tabular-nums ${accent ? `text-${accent}-600 dark:text-${accent}-400` : ''}`}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
        </Card>
    );
}

function ZoneStatusCard({ zone }: { zone: MorningSummaryZone }) {
    const { t } = useLang();
    const statusConfig: Record<string, { variant: 'success' | 'warning' | 'destructive'; label: string }> = {
        ok: { variant: 'success', label: t('OK') },
        warning: { variant: 'warning', label: t('Warning') },
        critical: { variant: 'destructive', label: t('Critical') },
    };
    const cfg = statusConfig[zone.status] ?? statusConfig.ok;

    return (
        <Card className="shadow-elevation-1">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{zone.name}</CardTitle>
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                {zone.temp_avg !== null ? (
                    <div className="flex items-baseline gap-1">
                        <span className="font-mono text-xl font-bold tabular-nums">{zone.temp_avg?.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">{'\u00B0'}C</span>
                        <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                            {zone.temp_min?.toFixed(1)} \u2014 {zone.temp_max?.toFixed(1)}
                        </span>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">{t('No temperature data')}</p>
                )}
            </CardContent>
        </Card>
    );
}
