import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, CheckCircle, Clock, FileText, ShieldCheck, Thermometer } from 'lucide-react';

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
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-6 w-6 text-emerald-600" />
                            <h1 className="text-2xl font-bold tracking-tight">{site.name} — {t('Audit Mode')}</h1>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t('Compliance overview for the last')} {days} {t('days')}. {t('Generated')} {new Date().toLocaleDateString()}.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {[90, 180, 365].map((d) => (
                            <Button
                                key={d}
                                variant={days === d ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => router.get(`/sites/${site.id}/audit`, { days: d }, { preserveState: true, replace: true })}
                            >
                                {d}d
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <SummaryCard icon={<Thermometer className="h-4 w-4" />} label={t('Devices')} value={String(summary.total_devices)} />
                    <SummaryCard
                        icon={<AlertTriangle className="h-4 w-4" />}
                        label={t('Excursions')}
                        value={String(summary.total_excursions)}
                        sub={`${summary.resolved_excursions} resolved`}
                        status={summary.total_excursions === summary.resolved_excursions ? 'success' : 'warning'}
                    />
                    <SummaryCard
                        icon={<FileText className="h-4 w-4" />}
                        label={t('Corrective Actions')}
                        value={String(summary.total_corrective_actions)}
                        sub={`${summary.verified_actions} verified`}
                        status={summary.total_corrective_actions === summary.verified_actions ? 'success' : 'warning'}
                    />
                    <SummaryCard
                        icon={<CheckCircle className="h-4 w-4" />}
                        label={t('Calibrations')}
                        value={`${summary.calibration_valid}/${summary.total_devices}`}
                        sub={summary.calibration_expired > 0 ? `${summary.calibration_expired} expired` : 'All current'}
                        status={summary.calibration_expired > 0 ? 'danger' : summary.calibration_none > 0 ? 'warning' : 'success'}
                    />
                    <SummaryCard
                        icon={<Clock className="h-4 w-4" />}
                        label={t('Monitoring Gaps')}
                        value={String(summary.monitoring_gaps)}
                        sub={summary.monitoring_gaps === 0 ? 'No gaps >15 min' : `${summary.monitoring_gaps} gap(s) detected`}
                        status={summary.monitoring_gaps === 0 ? 'success' : 'danger'}
                    />
                </div>

                {/* Excursions Table */}
                <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">{t('Temperature Excursions')} ({excursions.length})</CardTitle></CardHeader>
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
                                <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">{t('No excursions in this period')}</TableCell></TableRow>
                            ) : excursions.map((e) => (
                                <TableRow key={e.id} className="cursor-pointer" onClick={() => router.get(`/alerts/${e.id}`)}>
                                    <TableCell className="text-xs">{new Date(e.triggered_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-sm font-medium">{e.rule_name}</TableCell>
                                    <TableCell className="text-sm">{e.device_name}<br /><span className="text-xs text-muted-foreground">{e.zone}</span></TableCell>
                                    <TableCell><Badge variant={e.severity === 'critical' ? 'destructive' : 'warning'}>{e.severity}</Badge></TableCell>
                                    <TableCell className="text-sm">{e.duration_minutes ? `${e.duration_minutes} min` : 'Ongoing'}</TableCell>
                                    <TableCell><Badge variant={e.status === 'resolved' ? 'success' : 'destructive'}>{e.status}</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>

                {/* Corrective Actions Table */}
                <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">{t('Corrective Actions')} ({correctiveActions.length})</CardTitle></CardHeader>
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
                                <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">{t('No corrective actions in this period')}</TableCell></TableRow>
                            ) : correctiveActions.map((ca) => (
                                <TableRow key={ca.id}>
                                    <TableCell className="text-xs">{new Date(ca.taken_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="max-w-[300px] truncate text-sm">{ca.action_taken}</TableCell>
                                    <TableCell className="text-sm">{ca.taken_by}</TableCell>
                                    <TableCell><Badge variant={ca.status === 'verified' ? 'success' : 'warning'}>{ca.status}</Badge></TableCell>
                                    <TableCell className="text-sm">{ca.verified_by ?? '—'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>

                {/* Calibrations Table */}
                <Card>
                    <CardHeader><CardTitle className="text-sm font-medium">{t('Sensor Calibrations')} ({calibrations.length})</CardTitle></CardHeader>
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
                                <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">{t('No calibration records')}</TableCell></TableRow>
                            ) : calibrations.map((c) => (
                                <TableRow key={c.id}>
                                    <TableCell className="text-sm font-medium">{c.device_name}</TableCell>
                                    <TableCell className="text-sm">{c.zone ?? '—'}</TableCell>
                                    <TableCell className="text-xs">{new Date(c.calibrated_at).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-xs">{new Date(c.expires_at).toLocaleDateString()}</TableCell>
                                    <TableCell><Badge variant={c.status === 'valid' ? 'success' : c.status === 'expiring' ? 'warning' : 'destructive'}>{c.status}</Badge></TableCell>
                                    <TableCell className="text-sm">{c.calibrated_by ?? '—'}{c.method ? ` (${c.method})` : ''}</TableCell>
                                    <TableCell>{c.has_certificate ? <Badge variant="success">PDF</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>

                {/* Monitoring Gaps */}
                {monitoringGaps.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle className="text-sm font-medium text-destructive">{t('Monitoring Gaps >15 min')} ({monitoringGaps.length})</CardTitle></CardHeader>
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
                                        <TableCell className="text-xs">{new Date(g.gap_start).toLocaleString()}</TableCell>
                                        <TableCell className="text-xs">{new Date(g.gap_end).toLocaleString()}</TableCell>
                                        <TableCell><Badge variant="destructive">{g.duration_minutes} min</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}

function SummaryCard({ icon, label, value, sub, status = 'neutral' }: {
    icon: React.ReactNode; label: string; value: string; sub?: string;
    status?: 'success' | 'warning' | 'danger' | 'neutral';
}) {
    const colors = { success: 'text-emerald-600', warning: 'text-amber-600', danger: 'text-red-600', neutral: 'text-foreground' };
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-xs font-medium">{label}</span></div>
                <p className={`mt-1 text-2xl font-bold ${colors[status]}`}>{value}</p>
                {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
            </CardContent>
        </Card>
    );
}
