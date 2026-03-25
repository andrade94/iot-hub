import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardContent } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/detail-card';
import { FadeIn } from '@/components/ui/fade-in';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { PackageOpen, ShieldCheck } from 'lucide-react';

interface Props {
    site: { id: number; name: string };
    days: number;
    summary: {
        period_days: number;
        total_devices: number;
        total_excursions: number;
        resolved_excursions: number;
        total_corrective_actions: number;
        verified_actions: number;
        calibration_valid: number;
        calibration_expired: number;
        calibration_none: number;
        monitoring_gaps: number;
    };
    zones: Array<{ zone: string; device_count: number; devices: Array<{ id: number; name: string; model: string; calibration_status: string; calibration_expires: string | null }> }>;
    excursions: Array<{ id: number; triggered_at: string; severity: string; status: string; device_name: string; zone: string; rule_name: string; duration_minutes: number | null }>;
    correctiveActions: Array<{ id: number; alert_id: number; action_taken: string; status: string; taken_by: string; taken_at: string; verified_by: string | null; verified_at: string | null }>;
    calibrations: Array<{ id: number; device_name: string; zone: string; calibrated_at: string; expires_at: string; status: string; calibrated_by: string; has_certificate: boolean }>;
    monitoringGaps: Array<{ device_name: string; zone: string; gap_start: string; gap_end: string; duration_minutes: number }>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function AuditMode({ site, days, summary, zones, excursions, correctiveActions, calibrations, monitoringGaps }: Props) {
    const { t } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sites', href: '/dashboard' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Audit Mode', href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${site.name} — ${t('Audit Mode')}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div className="flex items-start gap-3">
                                <ShieldCheck className="mt-1 h-6 w-6 text-emerald-600" />
                                <div>
                                    <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t('Audit Mode')}
                                    </p>
                                    <h1 className="mt-1.5 font-display text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                        {site.name}
                                    </h1>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {t('Compliance overview for the last')}{' '}
                                        <span className="font-mono tabular-nums">{days}</span>{' '}
                                        {t('days')}. {t('Generated')}{' '}
                                        <span className="font-mono tabular-nums">{new Date().toLocaleDateString()}</span>.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <ButtonGroup>
                                    {[90, 180, 365].map((d) => (
                                        <Button
                                            key={d}
                                            variant={days === d ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => router.get(`/sites/${site.id}/audit`, { days: d }, { preserveState: true, replace: true })}
                                        >
                                            <span className="font-mono tabular-nums">{d}</span>d
                                        </Button>
                                    ))}
                                </ButtonGroup>
                                <div className="mx-1 h-6 w-px bg-border" />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.get(`/sites/${site.id}/audit/export`, { days })}
                                >
                                    <PackageOpen className="mr-1.5 h-3.5 w-3.5" />
                                    {t('Export Insurance Package')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Summary Cards ────────────────────────────────── */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <FadeIn delay={60} duration={400}>
                        <MetricCard
                            label={t('Devices')}
                            value={summary.total_devices}
                            className="shadow-elevation-1"
                        />
                    </FadeIn>
                    <FadeIn delay={120} duration={400}>
                        <MetricCard
                            label={t('Excursions')}
                            value={summary.total_excursions}
                            badge={`${summary.resolved_excursions} resolved`}
                            badgeColor={summary.total_excursions === summary.resolved_excursions ? 'text-emerald-600' : 'text-amber-600'}
                            className="shadow-elevation-1"
                        />
                    </FadeIn>
                    <FadeIn delay={180} duration={400}>
                        <MetricCard
                            label={t('Corrective Actions')}
                            value={summary.total_corrective_actions}
                            badge={`${summary.verified_actions} verified`}
                            badgeColor={summary.total_corrective_actions === summary.verified_actions ? 'text-emerald-600' : 'text-amber-600'}
                            className="shadow-elevation-1"
                        />
                    </FadeIn>
                    <FadeIn delay={240} duration={400}>
                        <MetricCard
                            label={t('Calibrations')}
                            value={`${summary.calibration_valid}/${summary.total_devices}`}
                            badge={summary.calibration_expired > 0 ? `${summary.calibration_expired} expired` : 'All current'}
                            badgeColor={summary.calibration_expired > 0 ? 'text-red-600' : summary.calibration_none > 0 ? 'text-amber-600' : 'text-emerald-600'}
                            className="shadow-elevation-1"
                        />
                    </FadeIn>
                    <FadeIn delay={300} duration={400}>
                        <MetricCard
                            label={t('Monitoring Gaps')}
                            value={summary.monitoring_gaps}
                            badge={summary.monitoring_gaps === 0 ? 'No gaps >15 min' : `${summary.monitoring_gaps} gap(s) detected`}
                            badgeColor={summary.monitoring_gaps === 0 ? 'text-emerald-600' : 'text-red-600'}
                            className="shadow-elevation-1"
                        />
                    </FadeIn>
                </div>

                {/* ── Excursions Table ─────────────────────────────── */}
                <FadeIn delay={200} duration={500}>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Temperature Excursions')}
                            </h2>
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                {excursions.length}
                            </span>
                        </div>
                        <Card className="shadow-elevation-1">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Date')}</TableHead>
                                        <TableHead>{t('Alert')}</TableHead>
                                        <TableHead>{t('Device / Zone')}</TableHead>
                                        <TableHead>{t('Severity')}</TableHead>
                                        <TableHead>{t('Duration')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {excursions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                                                {t('No excursions in this period')}
                                            </TableCell>
                                        </TableRow>
                                    ) : excursions.map((e) => (
                                        <TableRow key={e.id} className="cursor-pointer" onClick={() => router.get(`/alerts/${e.id}`)}>
                                            <TableCell className="font-mono text-xs tabular-nums">
                                                {new Date(e.triggered_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium">{e.rule_name}</TableCell>
                                            <TableCell className="text-sm">
                                                {e.device_name}
                                                <br />
                                                <span className="text-xs text-muted-foreground">{e.zone}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={e.severity === 'critical' ? 'destructive' : 'warning'}>
                                                    {e.severity}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm tabular-nums">
                                                {e.duration_minutes ? `${e.duration_minutes} min` : 'Ongoing'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={e.status === 'resolved' ? 'success' : 'destructive'}>
                                                    {e.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>
                </FadeIn>

                {/* ── Corrective Actions Table ────────────────────── */}
                <FadeIn delay={260} duration={500}>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Corrective Actions')}
                            </h2>
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                {correctiveActions.length}
                            </span>
                        </div>
                        <Card className="shadow-elevation-1">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Date')}</TableHead>
                                        <TableHead>{t('Action Taken')}</TableHead>
                                        <TableHead>{t('Taken By')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                        <TableHead>{t('Verified By')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {correctiveActions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                                                {t('No corrective actions in this period')}
                                            </TableCell>
                                        </TableRow>
                                    ) : correctiveActions.map((ca) => (
                                        <TableRow key={ca.id}>
                                            <TableCell className="font-mono text-xs tabular-nums">
                                                {new Date(ca.taken_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="max-w-[300px] truncate text-sm">{ca.action_taken}</TableCell>
                                            <TableCell className="text-sm">{ca.taken_by}</TableCell>
                                            <TableCell>
                                                <Badge variant={ca.status === 'verified' ? 'success' : 'warning'}>
                                                    {ca.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{ca.verified_by ?? '—'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>
                </FadeIn>

                {/* ── Calibrations Table ───────────────────────────── */}
                <FadeIn delay={320} duration={500}>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Sensor Calibrations')}
                            </h2>
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                {calibrations.length}
                            </span>
                        </div>
                        <Card className="shadow-elevation-1">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Device')}</TableHead>
                                        <TableHead>{t('Zone')}</TableHead>
                                        <TableHead>{t('Calibrated')}</TableHead>
                                        <TableHead>{t('Expires')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                        <TableHead>{t('Lab / Method')}</TableHead>
                                        <TableHead>{t('Certificate')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {calibrations.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                                                {t('No calibration records')}
                                            </TableCell>
                                        </TableRow>
                                    ) : calibrations.map((c) => (
                                        <TableRow key={c.id}>
                                            <TableCell className="text-sm font-medium">{c.device_name}</TableCell>
                                            <TableCell className="text-sm">{c.zone ?? '—'}</TableCell>
                                            <TableCell className="font-mono text-xs tabular-nums">
                                                {new Date(c.calibrated_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs tabular-nums">
                                                {new Date(c.expires_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={c.status === 'valid' ? 'success' : c.status === 'expiring' ? 'warning' : 'destructive'}>
                                                    {c.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{c.calibrated_by ?? '—'}</TableCell>
                                            <TableCell>
                                                {c.has_certificate
                                                    ? <Badge variant="success">PDF</Badge>
                                                    : <span className="text-xs text-muted-foreground">—</span>
                                                }
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>
                </FadeIn>

                {/* ── Monitoring Gaps ──────────────────────────────── */}
                {monitoringGaps.length > 0 && (
                    <FadeIn delay={380} duration={500}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-destructive">
                                    {t('Monitoring Gaps >15 min')}
                                </h2>
                                <div className="h-px flex-1 bg-border" />
                                <span className="font-mono text-xs tabular-nums text-destructive">
                                    {monitoringGaps.length}
                                </span>
                            </div>
                            <Card className="shadow-elevation-1">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Device')}</TableHead>
                                            <TableHead>{t('Zone')}</TableHead>
                                            <TableHead>{t('Gap Start')}</TableHead>
                                            <TableHead>{t('Gap End')}</TableHead>
                                            <TableHead>{t('Duration')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {monitoringGaps.map((g, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="text-sm font-medium">{g.device_name}</TableCell>
                                                <TableCell className="text-sm">{g.zone ?? '—'}</TableCell>
                                                <TableCell className="font-mono text-xs tabular-nums">
                                                    {new Date(g.gap_start).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs tabular-nums">
                                                    {new Date(g.gap_end).toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="destructive">
                                                        <span className="font-mono tabular-nums">{g.duration_minutes}</span> min
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    </FadeIn>
                )}
            </div>
        </AppLayout>
    );
}

/* ── Skeleton ─────────────────────────────────────────────────────── */

export function SiteAuditSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header skeleton */}
            <div className="rounded-xl border border-border/50 bg-card p-6 shadow-elevation-1 md:p-8">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-9 w-64" />
                <Skeleton className="mt-2 h-4 w-72" />
            </div>
            {/* Summary cards skeleton */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
            </div>
            {/* Table skeletons */}
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-4">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-48 rounded-xl" />
                </div>
            ))}
        </div>
    );
}
