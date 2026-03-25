import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DetailCard } from '@/components/ui/detail-card';
import { FadeIn } from '@/components/ui/fade-in';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import { Can } from '@/components/Can';
import AppLayout from '@/layouts/app-layout';
import type { AlertRule, BreadcrumbItem, Site } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Bell, Cpu, Pencil, ShieldAlert } from 'lucide-react';

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
                <FadeIn>
                    <Card className="shadow-elevation-1 overflow-hidden">
                        <div className="bg-dots relative border-b px-6 py-5">
                            <div className="flex items-start gap-4">
                                <Button variant="ghost" size="icon" onClick={() => router.get(`/sites/${site.id}/rules`)}>
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <div className="flex-1">
                                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{t('Alert Rule')}</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-3">
                                        <ShieldAlert className="h-5 w-5 text-muted-foreground" />
                                        <h1 className="font-display text-2xl font-bold tracking-tight">{rule.name}</h1>
                                        <SeverityBadge severity={rule.severity} />
                                        <Badge variant={rule.active ? 'success' : 'outline'}>{rule.active ? t('Active') : t('Inactive')}</Badge>
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {t('Type')}: {rule.type} · {t('Cooldown')}: <span className="font-mono tabular-nums">{rule.cooldown_minutes}</span> {t('min')}
                                    </p>
                                </div>
                                <Can permission="manage alert rules">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/sites/${site.id}/rules/${rule.id}/edit`}>
                                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                            {t('Edit')}
                                        </Link>
                                    </Button>
                                </Can>
                            </div>
                        </div>
                    </Card>
                </FadeIn>

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6">
                        <FadeIn delay={100}>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{t('Conditions')}</p>
                                    <div className="h-px flex-1 bg-border" />
                                    <span className="font-mono text-xs tabular-nums text-muted-foreground">{rule.conditions.length}</span>
                                </div>
                                <Card className="shadow-elevation-1">
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
                                                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">{t('No conditions defined')}</TableCell>
                                                </TableRow>
                                            ) : (
                                                rule.conditions.map((cond, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium">{cond.metric}</TableCell>
                                                        <TableCell><Badge variant="outline" className="text-xs">{cond.condition}</Badge></TableCell>
                                                        <TableCell className="font-mono tabular-nums">{cond.threshold}</TableCell>
                                                        <TableCell className="font-mono text-sm tabular-nums">{cond.duration_minutes > 0 ? `${cond.duration_minutes} ${t('min')}` : t('Instant')}</TableCell>
                                                        <TableCell><ConditionSeverityBadge severity={cond.severity} /></TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </Card>
                            </div>
                        </FadeIn>

                        {rule.device && (
                            <FadeIn delay={200}>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{t('Associated Device')}</p>
                                        <div className="h-px flex-1 bg-border" />
                                    </div>
                                    <Card className="shadow-elevation-1">
                                        <CardContent className="p-4">
                                            <div
                                                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                                                onClick={() => router.get(`/sites/${site.id}/devices/${rule.device!.id}`)}
                                            >
                                                <Cpu className="h-5 w-5 text-muted-foreground" />
                                                <div>
                                                    <p className="text-sm font-medium">{rule.device.name}</p>
                                                    <p className="font-mono text-xs tabular-nums text-muted-foreground">{rule.device.model} · {rule.device.dev_eui}</p>
                                                </div>
                                                <Badge variant="outline" className="ml-auto text-xs">{rule.device.status}</Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </FadeIn>
                        )}
                    </div>

                    <FadeIn delay={300}>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{t('Details')}</p>
                                <div className="h-px flex-1 bg-border" />
                            </div>
                            <DetailCard
                                className="shadow-elevation-1"
                                items={[
                                    { label: t('Rule ID'), value: <span className="font-mono tabular-nums">#{rule.id}</span> },
                                    { label: t('Name'), value: rule.name },
                                    { label: t('Type'), value: rule.type },
                                    { label: t('Severity'), value: rule.severity },
                                    { label: t('Cooldown'), value: <span className="font-mono tabular-nums">{rule.cooldown_minutes} min</span> },
                                    { label: t('Status'), value: rule.active ? t('Active') : t('Inactive') },
                                    { label: t('Site'), value: site.name },
                                    { label: t('Device'), value: rule.device?.name ?? t('All devices') },
                                    { label: t('Conditions'), value: <span className="font-mono tabular-nums">{rule.conditions.length}</span> },
                                    { label: t('Created'), value: <span className="font-mono tabular-nums">{new Date(rule.created_at).toLocaleDateString()}</span> },
                                ]}
                            />
                        </div>
                    </FadeIn>
                </div>
            </div>
        </AppLayout>
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
    return <Badge variant={variant} className="gap-1"><Icon className="h-3 w-3" />{severity}</Badge>;
}

function ConditionSeverityBadge({ severity }: { severity: string }) {
    const variants: Record<string, 'destructive' | 'warning' | 'info' | 'outline'> = {
        critical: 'destructive', high: 'warning', medium: 'info', low: 'outline',
    };
    return <Badge variant={variants[severity] ?? 'outline'} className="text-xs">{severity}</Badge>;
}
