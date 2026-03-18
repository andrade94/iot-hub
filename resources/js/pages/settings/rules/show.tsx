import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { AlertRule, BreadcrumbItem, Site } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Bell, Cpu, ShieldAlert } from 'lucide-react';

interface Props {
    site: Site;
    rule: AlertRule;
}

export default function AlertRuleShow({ site, rule }: Props) {
    const { t } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sites', href: '/settings/sites' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Alert Rules', href: `/sites/${site.id}/rules` },
        { title: rule.name, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${rule.name} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.get(`/sites/${site.id}/rules`)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
                            <h1 className="text-2xl font-bold tracking-tight">{rule.name}</h1>
                            <SeverityBadge severity={rule.severity} />
                            <Badge variant={rule.active ? 'success' : 'outline'}>
                                {rule.active ? t('Active') : t('Inactive')}
                            </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t('Type')}: {rule.type} · {t('Cooldown')}: {rule.cooldown_minutes} {t('min')}
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    {/* Conditions table */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    {t('Conditions')} ({rule.conditions.length})
                                </CardTitle>
                            </CardHeader>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Metric')}</TableHead>
                                        <TableHead>{t('Condition')}</TableHead>
                                        <TableHead>{t('Threshold')}</TableHead>
                                        <TableHead>{t('Duration')}</TableHead>
                                        <TableHead>{t('Severity')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rule.conditions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                                                {t('No conditions defined')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        rule.conditions.map((cond, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">{cond.metric}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">{cond.condition}</Badge>
                                                </TableCell>
                                                <TableCell className="font-mono tabular-nums">{cond.threshold}</TableCell>
                                                <TableCell className="text-sm">
                                                    {cond.duration_minutes > 0
                                                        ? `${cond.duration_minutes} ${t('min')}`
                                                        : t('Instant')}
                                                </TableCell>
                                                <TableCell>
                                                    <ConditionSeverityBadge severity={cond.severity} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Card>

                        {/* Device info */}
                        {rule.device && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('Associated Device')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div
                                        className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                                        onClick={() => router.get(`/sites/${site.id}/devices/${rule.device!.id}`)}
                                    >
                                        <Cpu className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">{rule.device.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {rule.device.model} · {rule.device.dev_eui}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="ml-auto text-xs">{rule.device.status}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Details sidebar */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Details')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <DetailRow label={t('Rule ID')} value={`#${rule.id}`} />
                                <DetailRow label={t('Name')} value={rule.name} />
                                <DetailRow label={t('Type')} value={rule.type} />
                                <DetailRow label={t('Severity')} value={rule.severity} />
                                <DetailRow label={t('Cooldown')} value={`${rule.cooldown_minutes} min`} />
                                <DetailRow label={t('Status')} value={rule.active ? t('Active') : t('Inactive')} />
                                <DetailRow label={t('Site')} value={site.name} />
                                <DetailRow label={t('Device')} value={rule.device?.name ?? t('All devices')} />
                                <DetailRow label={t('Conditions')} value={String(rule.conditions.length)} />
                                <DetailRow
                                    label={t('Created')}
                                    value={new Date(rule.created_at).toLocaleDateString()}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

function SeverityBadge({ severity }: { severity: string }) {
    const config: Record<string, { variant: 'destructive' | 'warning' | 'info' | 'outline'; icon: typeof ShieldAlert }> = {
        critical: { variant: 'destructive', icon: ShieldAlert },
        high: { variant: 'warning', icon: ShieldAlert },
        medium: { variant: 'info', icon: Bell },
        low: { variant: 'outline', icon: Bell },
    };
    const { variant, icon: Icon } = config[severity] ?? config.low;
    return (
        <Badge variant={variant} className="gap-1">
            <Icon className="h-3 w-3" />
            {severity}
        </Badge>
    );
}

function ConditionSeverityBadge({ severity }: { severity: string }) {
    const variants: Record<string, 'destructive' | 'warning' | 'info' | 'outline'> = {
        critical: 'destructive',
        high: 'warning',
        medium: 'info',
        low: 'outline',
    };
    return <Badge variant={variants[severity] ?? 'outline'} className="text-xs">{severity}</Badge>;
}
