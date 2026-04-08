import { Can } from '@/components/Can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { Switch } from '@/components/ui/switch';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { Alert, AlertRule, BreadcrumbItem, Site } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    site: Site;
    rule: AlertRule;
    recentAlerts?: Alert[];
    alertsTriggeredCount?: number;
}

const severityVariant: Record<string, 'destructive' | 'warning' | 'info' | 'outline'> = {
    critical: 'destructive', high: 'warning', medium: 'info', low: 'outline',
};

const severityDot: Record<string, string> = {
    critical: 'bg-rose-500', high: 'bg-orange-500', medium: 'bg-amber-400', low: 'bg-blue-400',
};

export default function AlertRuleShow({ site, rule, recentAlerts = [], alertsTriggeredCount = 0 }: Props) {
    const { t } = useLang();
    const [showDelete, setShowDelete] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: site.name, href: `/sites/${site.id}` },
        { title: t('Alert Rules'), href: `/sites/${site.id}/rules` },
        { title: rule.name, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${rule.name} — ${site.name}`} />
            <div className="obsidian flex h-full flex-1 flex-col bg-background p-5 md:p-8">
                {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn direction="down" duration={400}>
                    <div className="flex items-start justify-between">
                        <div>
                            <button onClick={() => router.get(`/sites/${site.id}/rules`)}
                                className="mb-2 flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground">
                                <ArrowLeft className="h-3 w-3" />{t('Alert Rules')}
                            </button>
                            <div className="flex items-center gap-3">
                                <h1 className="font-display text-[28px] font-bold tracking-tight">{rule.name}</h1>
                                <Badge variant={severityVariant[rule.severity]} className="text-[9px] capitalize">{rule.severity}</Badge>
                                <Badge variant={rule.active ? 'success' : 'outline'} className="text-[9px]">{rule.active ? t('Active') : t('Inactive')}</Badge>
                            </div>
                            <p className="mt-1 text-[13px] text-muted-foreground">
                                {t('Cooldown')}: <span className="font-mono">{rule.cooldown_minutes} min</span> ·{' '}
                                {rule.device ? rule.device.name : t('All devices')}
                            </p>
                        </div>
                        <Can permission="manage alert rules">
                            <div className="flex items-center gap-3">
                                <Switch checked={rule.active}
                                    onCheckedChange={(v) => router.put(`/sites/${site.id}/rules/${rule.id}`, { active: v }, { preserveScroll: true })} />
                                <Button variant="outline" size="sm" className="text-[11px]" asChild>
                                    <Link href={`/sites/${site.id}/rules/${rule.id}/edit`}>
                                        <Pencil className="mr-1 h-3 w-3" />{t('Edit')}
                                    </Link>
                                </Button>
                                <Button variant="outline" size="sm" className="text-[11px] text-rose-600 dark:text-rose-400 border-rose-200/40 dark:border-rose-800/40"
                                    onClick={() => setShowDelete(true)}>
                                    <Trash2 className="mr-1 h-3 w-3" />{t('Delete')}
                                </Button>
                            </div>
                        </Can>
                    </div>
                </FadeIn>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
                    {/* ━━ LEFT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                    <div>
                        {/* Conditions */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('CONDITIONS').toUpperCase()}</span>
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] text-muted-foreground/50">{rule.conditions.length}</span>
                        </div>

                        <FadeIn delay={50} duration={400}>
                            <Card className="border-border shadow-none overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border/30">
                                            <th className="text-left px-4 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Metric')}</th>
                                            <th className="text-left px-3 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Condition')}</th>
                                            <th className="text-left px-3 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Threshold')}</th>
                                            <th className="text-left px-3 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Duration')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rule.conditions.map((cond, idx) => (
                                            <tr key={idx} className="border-b border-border/20 last:border-b-0">
                                                <td className="px-4 py-3.5"><span className="font-mono text-[12px] font-medium">{cond.metric}</span></td>
                                                <td className="px-3 py-3.5"><Badge variant="outline" className="text-[9px]">{cond.condition}</Badge></td>
                                                <td className="px-3 py-3.5"><span className="font-mono text-[16px] font-bold">{cond.threshold}</span></td>
                                                <td className="px-3 py-3.5 text-muted-foreground">
                                                    {cond.duration_minutes === 0 ? t('Instant') : <span className="font-mono">{cond.duration_minutes} min</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Card>
                        </FadeIn>

                        {/* Recent Alerts */}
                        <div className="flex items-center gap-4 mt-8 mb-4">
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('RECENT ALERTS')}</span>
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] text-muted-foreground/50">{alertsTriggeredCount}</span>
                        </div>

                        <FadeIn delay={100} duration={400}>
                            {recentAlerts.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-10">
                                    <p className="text-[13px] text-muted-foreground">{t('No alerts triggered by this rule yet')}</p>
                                </div>
                            ) : (
                                <Card className="border-border shadow-none overflow-hidden">
                                    <div className="divide-y divide-border/20">
                                        {recentAlerts.map((alert) => (
                                            <div key={alert.id} className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-accent/30"
                                                onClick={() => router.get(`/alerts/${alert.id}`)}>
                                                <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', severityDot[alert.severity] ?? severityDot.low)} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[12px] font-medium">
                                                        {alert.data?.metric && (
                                                            <><span className="font-mono text-rose-500">{alert.data.metric}: {alert.data.value}</span> on </>
                                                        )}
                                                        {alert.data?.device_name ?? `Alert #${alert.id}`}
                                                    </p>
                                                    <p className="font-mono text-[9px] text-muted-foreground/60">
                                                        {alert.triggered_at ? formatTimeAgo(alert.triggered_at) : formatTimeAgo(alert.created_at)}
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className="text-[8px] capitalize">{alert.status}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                    {alertsTriggeredCount > recentAlerts.length && (
                                        <div className="border-t border-border/20 px-4 py-2 text-center">
                                            <button onClick={() => router.get('/alerts')} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                                                {t('View all alerts from this rule')} →
                                            </button>
                                        </div>
                                    )}
                                </Card>
                            )}
                        </FadeIn>
                    </div>

                    {/* ━━ RIGHT: DETAILS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{t('DETAILS')}</span>
                            <div className="h-px flex-1 bg-border" />
                        </div>

                        <FadeIn delay={80} duration={400}>
                            <Card className="border-border shadow-none overflow-hidden">
                                {[
                                    { label: t('Rule ID'), value: <span className="font-mono font-medium">#{rule.id}</span> },
                                    { label: t('Name'), value: <span className="font-medium">{rule.name}</span> },
                                    { label: t('Severity'), value: <Badge variant={severityVariant[rule.severity]} className="text-[8px] capitalize">{rule.severity}</Badge> },
                                    { label: t('Cooldown'), value: <span className="font-mono">{rule.cooldown_minutes} min</span> },
                                    { label: t('Status'), value: <Badge variant={rule.active ? 'success' : 'outline'} className="text-[8px]">{rule.active ? t('Active') : t('Inactive')}</Badge> },
                                    { label: t('Site'), value: site.name },
                                    { label: t('Device'), value: rule.device ? rule.device.name : t('All devices') },
                                    { label: t('Conditions'), value: <span className="font-mono">{rule.conditions.length}</span> },
                                    { label: t('Alerts triggered'), value: <span className={cn('font-mono font-semibold', alertsTriggeredCount > 0 && 'text-rose-500')}>{alertsTriggeredCount}</span> },
                                    { label: t('Created'), value: <span className="font-mono">{new Date(rule.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span> },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-border/20 last:border-b-0">
                                        <span className="text-[11px] text-muted-foreground">{item.label}</span>
                                        <span className="text-[11px]">{item.value}</span>
                                    </div>
                                ))}
                            </Card>
                        </FadeIn>
                    </div>
                </div>
            </div>

            <ConfirmationDialog
                open={showDelete}
                onOpenChange={setShowDelete}
                title={t('Delete Alert Rule')}
                description={`${t('Delete')} "${rule.name}"?`}
                warningMessage={t('Active alerts using this rule will not be affected, but no new alerts will be created.')}
                onConfirm={() => {
                    router.delete(`/sites/${site.id}/rules/${rule.id}`, {
                        onSuccess: () => router.get(`/sites/${site.id}/rules`),
                    });
                }}
                actionLabel={t('Delete')}
            />
        </AppLayout>
    );
}
