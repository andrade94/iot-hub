import { Can } from '@/components/Can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { AlertRule, BreadcrumbItem, Site } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Search, Settings2, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Props {
    site: Site;
    rules: AlertRule[];
}

const severityVariant: Record<string, 'destructive' | 'warning' | 'info' | 'outline'> = {
    critical: 'destructive',
    high: 'warning',
    medium: 'info',
    low: 'outline',
};

export default function AlertRuleIndex({ site, rules }: Props) {
    const { t } = useLang();
    const [deleteRule, setDeleteRule] = useState<AlertRule | null>(null);
    const [search, setSearch] = useState('');
    const [severityFilter, setSeverityFilter] = useState('all');

    const filtered = useMemo(() => {
        let result = rules;
        if (severityFilter !== 'all') result = result.filter((r) => r.severity === severityFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter((r) => r.name.toLowerCase().includes(q) || r.conditions.some((c) => c.metric.toLowerCase().includes(q)));
        }
        return result;
    }, [rules, search, severityFilter]);

    const activeCount = rules.filter((r) => r.active).length;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: t('Alert Rules'), href: '#' },
    ];

    function toggleActive(rule: AlertRule) {
        router.put(`/sites/${site.id}/rules/${rule.id}`, { active: !rule.active }, { preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Alert Rules')} — ${site.name}`} />
            <div className="obsidian flex h-full flex-1 flex-col bg-background p-5 md:p-8">
                {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn direction="down" duration={400}>
                    <div className="flex items-start justify-between">
                        <div>
                            <button onClick={() => router.get(`/sites/${site.id}?tab=setup`)}
                                className="mb-2 flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground">
                                ← {site.name}
                            </button>
                            <h1 className="font-display text-[28px] font-bold tracking-tight text-foreground md:text-[32px]">
                                {t('Alert Rules')}
                            </h1>
                            <p className="mt-1 text-[13px] text-muted-foreground">
                                <span className="font-mono tabular-nums font-medium text-foreground">{rules.length}</span>{' '}
                                {t('rules')} · <span className="text-emerald-600 dark:text-emerald-400">{activeCount} {t('active')}</span>
                                {rules.length - activeCount > 0 && (
                                    <> · <span className="text-muted-foreground">{rules.length - activeCount} {t('inactive')}</span></>
                                )}
                            </p>
                        </div>
                        <Can permission="manage alert rules">
                            <div className="flex gap-2">
                                {rules.length === 0 && (
                                    <Button variant="outline" size="sm" className="text-[11px]"
                                        onClick={() => router.post(`/sites/${site.id}/rules/generate`, {}, { preserveScroll: true })}>
                                        {t('Generate from Recipes')}
                                    </Button>
                                )}
                                <Button size="sm" className="text-[11px]" asChild>
                                    <Link href={`/sites/${site.id}/rules/create`}>
                                        <Plus className="mr-1.5 h-3.5 w-3.5" />{t('New Rule')}
                                    </Link>
                                </Button>
                            </div>
                        </Can>
                    </div>
                </FadeIn>

                {/* ━━ FILTERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                {rules.length > 0 && (
                    <FadeIn delay={50} duration={400}>
                        <div className="mt-6 flex flex-wrap items-center gap-2">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                                <Input value={search} onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t('Search rules...')} className="h-8 pl-9 text-[12px]" />
                            </div>
                            <div className="flex overflow-hidden rounded-md border border-border">
                                {['all', 'critical', 'high', 'medium', 'low'].map((s) => (
                                    <button key={s} onClick={() => setSeverityFilter(s)}
                                        className={cn('px-3 py-1.5 font-mono text-[10px] font-medium transition-colors border-r border-border last:border-r-0',
                                            severityFilter === s ? 'bg-accent text-foreground' : 'text-muted-foreground/60 hover:bg-accent/30')}>
                                        {s === 'all' ? t('All') : <span className="capitalize">{s}</span>}
                                    </button>
                                ))}
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground/60">{filtered.length}/{rules.length}</span>
                        </div>
                    </FadeIn>
                )}

                {/* ━━ TABLE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={100} duration={400}>
                    {rules.length === 0 ? (
                        <div className="mt-6">
                            <EmptyState
                                icon={<Settings2 className="h-5 w-5 text-muted-foreground" />}
                                title={t('No alert rules configured')}
                                description={t('Create rules to automatically detect and alert on sensor anomalies')}
                                action={
                                    <Can permission="manage alert rules">
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" className="text-[11px]"
                                                onClick={() => router.post(`/sites/${site.id}/rules/generate`, {}, { preserveScroll: true })}>
                                                {t('Generate from Recipes')}
                                            </Button>
                                            <Button size="sm" asChild>
                                                <Link href={`/sites/${site.id}/rules/create`}>
                                                    <Plus className="mr-1.5 h-3.5 w-3.5" />{t('Create First Rule')}
                                                </Link>
                                            </Button>
                                        </div>
                                    </Can>
                                }
                            />
                        </div>
                    ) : (
                        <Card className="mt-4 border-border shadow-none overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border/30">
                                        <th className="text-left px-4 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Rule')}</th>
                                        <th className="text-left px-3 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Severity')}</th>
                                        <th className="text-left px-3 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Conditions')}</th>
                                        <th className="text-left px-3 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Scope')}</th>
                                        <th className="text-left px-3 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Cooldown')}</th>
                                        <th className="text-center px-3 py-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">{t('Active')}</th>
                                        <th className="w-[80px]"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center">
                                                <p className="text-[13px] text-muted-foreground">{t('No rules match your search')}</p>
                                            </td>
                                        </tr>
                                    ) : filtered.map((rule) => (
                                        <tr key={rule.id} className="group border-b border-border/20 cursor-pointer transition-colors hover:bg-accent/30"
                                            onClick={() => router.get(`/sites/${site.id}/rules/${rule.id}`)}>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <span className={cn('h-2 w-2 shrink-0 rounded-full',
                                                        rule.severity === 'critical' ? 'bg-rose-500' :
                                                        rule.severity === 'high' ? 'bg-orange-500' :
                                                        rule.severity === 'medium' ? 'bg-amber-400' : 'bg-blue-400')} />
                                                    <div className={cn(!rule.active && 'opacity-50')}>
                                                        <p className="text-[13px] font-medium">{rule.name}</p>
                                                        <p className="font-mono text-[9px] text-muted-foreground/60">
                                                            {rule.conditions[0]?.metric} {rule.conditions[0]?.condition} {rule.conditions[0]?.threshold}
                                                            {rule.conditions.length > 1 && ` +${rule.conditions.length - 1}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3.5">
                                                <Badge variant={severityVariant[rule.severity] ?? 'outline'} className="text-[9px] capitalize">{rule.severity}</Badge>
                                            </td>
                                            <td className="px-3 py-3.5">
                                                {rule.conditions.slice(0, 2).map((c, i) => (
                                                    <span key={i} className="mr-1">
                                                        <span className="font-mono text-[11px]">{c.metric}</span>{' '}
                                                        <span className="text-[10px] text-muted-foreground">{c.condition} {c.threshold}</span>
                                                        {i < Math.min(rule.conditions.length, 2) - 1 && <span className="mx-1 text-[9px] text-primary/60">AND</span>}
                                                    </span>
                                                ))}
                                            </td>
                                            <td className="px-3 py-3.5 text-[12px] text-muted-foreground">
                                                {rule.device ? rule.device.name : t('All devices')}
                                            </td>
                                            <td className="px-3 py-3.5">
                                                <span className="font-mono text-[11px] text-muted-foreground">{rule.cooldown_minutes}m</span>
                                            </td>
                                            <td className="px-3 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                                                <Can permission="manage alert rules">
                                                    <Switch checked={rule.active} onCheckedChange={() => toggleActive(rule)} />
                                                </Can>
                                            </td>
                                            <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                                                <Can permission="manage alert rules">
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon-sm"
                                                            onClick={() => router.get(`/sites/${site.id}/rules/${rule.id}/edit`)}>
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon-sm" className="text-destructive"
                                                            onClick={() => setDeleteRule(rule)}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </Can>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    )}
                </FadeIn>
            </div>

            <ConfirmationDialog
                open={!!deleteRule}
                onOpenChange={(open) => !open && setDeleteRule(null)}
                title={t('Delete Alert Rule')}
                description={`${t('Delete')} "${deleteRule?.name}"?`}
                warningMessage={t('Active alerts using this rule will not be affected, but no new alerts will be created.')}
                onConfirm={() => {
                    if (deleteRule) {
                        router.delete(`/sites/${site.id}/rules/${deleteRule.id}`, {
                            preserveScroll: true,
                            onSuccess: () => setDeleteRule(null),
                        });
                    }
                }}
                actionLabel={t('Delete')}
            />
        </AppLayout>
    );
}
