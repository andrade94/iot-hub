import { Can } from '@/components/Can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { AlertRule, BreadcrumbItem, Site } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Bell,
    Plus,
    Settings2,
    ShieldAlert,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';

interface Props {
    site: Site;
    rules: AlertRule[];
}

export default function AlertRuleIndex({ site, rules }: Props) {
    const { t } = useLang();
    const [deleteRule, setDeleteRule] = useState<AlertRule | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sites', href: '/settings/sites' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Alert Rules', href: '#' },
    ];

    const activeCount = rules.filter((r) => r.active).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Alert Rules')} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header card with bg-dots ── */}
                <FadeIn>
                    <Card className="shadow-elevation-1 overflow-hidden">
                        <div className="bg-dots relative border-b px-6 py-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                        {t('Alert Rules')}
                                    </p>
                                    <h1 className="font-display mt-1 text-2xl font-bold tracking-tight">
                                        {site.name}
                                    </h1>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        <span className="font-mono tabular-nums">{rules.length}</span>{' '}
                                        {t('rule(s)')},{' '}
                                        <span className="font-mono tabular-nums">{activeCount}</span>{' '}
                                        {t('active')}
                                    </p>
                                </div>
                                <Can permission="manage alert rules">
                                    <Button asChild>
                                        <Link href={`/sites/${site.id}/rules/create`}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t('New Rule')}
                                        </Link>
                                    </Button>
                                </Can>
                            </div>
                        </div>
                    </Card>
                </FadeIn>

                {/* ── Rules list ── */}
                {rules.length === 0 ? (
                    <FadeIn delay={100}>
                        <EmptyState
                            icon={<Settings2 className="h-6 w-6 text-muted-foreground" />}
                            title={t('No alert rules configured')}
                            description={t(
                                'Create rules to automatically detect and alert on sensor anomalies',
                            )}
                            action={
                                <Can permission="manage alert rules">
                                    <Button asChild>
                                        <Link href={`/sites/${site.id}/rules/create`}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t('Create First Rule')}
                                        </Link>
                                    </Button>
                                </Can>
                            }
                        />
                    </FadeIn>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {rules.map((rule, idx) => (
                            <FadeIn key={rule.id} delay={80 + idx * 60}>
                                <RuleCard
                                    rule={rule}
                                    siteId={site.id}
                                    onDelete={setDeleteRule}
                                />
                            </FadeIn>
                        ))}
                    </div>
                )}

                <ConfirmationDialog
                    open={!!deleteRule}
                    onOpenChange={(open) => !open && setDeleteRule(null)}
                    title={t('Delete Alert Rule')}
                    description={`Delete "${deleteRule?.name}"? This cannot be undone.`}
                    warningMessage={t(
                        'Active alerts using this rule will not be affected, but no new alerts will be created.',
                    )}
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
            </div>
        </AppLayout>
    );
}

/* ── Rule Card ───────────────────────────────────── */

function RuleCard({
    rule,
    siteId,
    onDelete,
}: {
    rule: AlertRule;
    siteId: number;
    onDelete: (rule: AlertRule) => void;
}) {
    const { t } = useLang();

    function toggleActive() {
        router.put(
            `/sites/${siteId}/rules/${rule.id}`,
            { active: !rule.active },
            { preserveScroll: true },
        );
    }

    const severityIcons: Record<string, typeof ShieldAlert> = {
        critical: ShieldAlert,
        high: AlertTriangle,
        medium: Bell,
        low: Bell,
    };
    const Icon = severityIcons[rule.severity] ?? Bell;

    return (
        <Card
            className={`shadow-elevation-1 transition-opacity ${!rule.active ? 'opacity-60' : ''}`}
        >
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <CardTitle className="text-sm">{rule.name}</CardTitle>
                    </div>
                    <Can permission="manage alert rules">
                        <Switch checked={rule.active} onCheckedChange={toggleActive} />
                    </Can>
                </div>
                <CardDescription className="flex items-center gap-2">
                    <SeverityBadge severity={rule.severity} />
                    <Badge variant="outline" className="text-xs">
                        {rule.type}
                    </Badge>
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Conditions preview */}
                <div className="space-y-1.5">
                    {rule.conditions.slice(0, 3).map((cond, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-2 rounded bg-muted/50 px-2 py-1 text-xs"
                        >
                            <span className="font-mono font-medium">{cond.metric}</span>
                            <span className="text-muted-foreground">{cond.condition}</span>
                            <span className="font-mono font-medium tabular-nums">
                                {cond.threshold}
                            </span>
                            {cond.duration_minutes > 0 && (
                                <span className="font-mono tabular-nums text-muted-foreground">
                                    for {cond.duration_minutes}m
                                </span>
                            )}
                        </div>
                    ))}
                    {rule.conditions.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                            +<span className="font-mono tabular-nums">{rule.conditions.length - 3}</span>{' '}
                            {t('more')}
                        </p>
                    )}
                </div>

                {rule.device && (
                    <p className="mt-2 text-xs text-muted-foreground">
                        {t('Device')}: {rule.device.name}
                    </p>
                )}

                <p className="mt-2 text-xs text-muted-foreground">
                    {t('Cooldown')}:{' '}
                    <span className="font-mono tabular-nums">{rule.cooldown_minutes}</span>m
                </p>

                {/* Actions */}
                <Can permission="manage alert rules">
                    <div className="mt-3 flex justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.get(`/sites/${siteId}/rules/${rule.id}`)}
                        >
                            {t('Edit')}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive"
                            onClick={() => onDelete(rule)}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </Can>
            </CardContent>
        </Card>
    );
}

/* ── Sub-components ──────────────────────────────── */

export function AlertRulesIndexSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border overflow-hidden">
                <div className="border-b px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="mt-2 h-7 w-36" />
                            <Skeleton className="mt-2 h-4 w-28" />
                        </div>
                        <Skeleton className="h-9 w-28" />
                    </div>
                </div>
            </div>
            {/* Rules Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border p-4 space-y-3">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-4" />
                                <Skeleton className="h-4 w-28" />
                            </div>
                            <Skeleton className="h-5 w-9 rounded-full" />
                        </div>
                        <div className="flex gap-2">
                            <Skeleton className="h-5 w-16 rounded-full" />
                            <Skeleton className="h-5 w-14 rounded-full" />
                        </div>
                        <div className="space-y-1.5">
                            {Array.from({ length: 2 }).map((_, j) => (
                                <Skeleton key={j} className="h-6 w-full rounded" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SeverityBadge({ severity }: { severity: string }) {
    const variants: Record<string, 'destructive' | 'warning' | 'info' | 'outline'> = {
        critical: 'destructive',
        high: 'warning',
        medium: 'info',
        low: 'outline',
    };
    return (
        <Badge variant={variants[severity] ?? 'outline'} className="text-xs">
            {severity}
        </Badge>
    );
}
