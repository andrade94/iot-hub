import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
            <Head title={`${t('Morning Summary')} — ${site.name}`} />
            <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 md:p-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold tracking-tight">{t('Morning Summary')}</h1>
                    <p className="text-sm text-muted-foreground">
                        {site.name} — {new Date(summary.generated_at).toLocaleDateString()}
                    </p>
                </div>

                {/* Overall health */}
                <Card>
                    <CardContent className="p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <span className="text-sm font-medium">{t('Fleet Health')}</span>
                            <span className="text-2xl font-bold tabular-nums">{healthPct}%</span>
                        </div>
                        <Progress
                            value={healthPct}
                            size="lg"
                            variant={healthPct > 80 ? 'success' : healthPct > 50 ? 'warning' : 'destructive'}
                        />
                    </CardContent>
                </Card>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <SummaryCard icon={<Cpu className="h-5 w-5" />} label={t('Total')} value={d.total} />
                    <SummaryCard icon={<Signal className="h-5 w-5 text-emerald-500" />} label={t('Online')} value={d.online} accent="emerald" />
                    <SummaryCard icon={<WifiOff className="h-5 w-5 text-red-500" />} label={t('Offline')} value={d.offline} accent={d.offline > 0 ? 'red' : undefined} />
                    <SummaryCard icon={<BatteryLow className="h-5 w-5 text-amber-500" />} label={t('Low Battery')} value={d.low_battery} accent={d.low_battery > 0 ? 'amber' : undefined} />
                </div>

                {/* Alerts */}
                <div className="grid grid-cols-2 gap-3">
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            <div>
                                <p className="text-2xl font-bold tabular-nums">{summary.alerts_24h}</p>
                                <p className="text-xs text-muted-foreground">{t('Alerts (24h)')}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-3 p-4">
                            {summary.active_alerts > 0 ? (
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                            ) : (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            )}
                            <div>
                                <p className="text-2xl font-bold tabular-nums">{summary.active_alerts}</p>
                                <p className="text-xs text-muted-foreground">{t('Active Now')}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Zones */}
                <h2 className="text-lg font-semibold">{t('Zone Status')}</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                    {summary.zones.map((zone) => (
                        <ZoneStatusCard key={zone.name} zone={zone} />
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}

function SummaryCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: string }) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                {icon}
                <p className={`text-2xl font-bold tabular-nums ${accent ? `text-${accent}-600 dark:text-${accent}-400` : ''}`}>{value}</p>
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
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{zone.name}</CardTitle>
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                {zone.temp_avg !== null ? (
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold tabular-nums">{zone.temp_avg?.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">°C</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                            {zone.temp_min?.toFixed(1)} — {zone.temp_max?.toFixed(1)}
                        </span>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">{t('No temperature data')}</p>
                )}
            </CardContent>
        </Card>
    );
}
