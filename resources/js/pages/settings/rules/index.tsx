import { Can } from '@/components/Can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
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

interface Props {
    site: Site;
    rules: AlertRule[];
}

export default function AlertRuleIndex({ site, rules }: Props) {
    const { t } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sites', href: '/settings/sites' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Alert Rules', href: '#' },
    ];

    const activeCount = rules.filter((r) => r.active).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Alert Rules')} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('Alert Rules')}</h1>
                        <p className="text-sm text-muted-foreground">
                            {site.name} — {rules.length} {t('rule(s)')}, {activeCount} {t('active')}
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

                {/* Rules list */}
                {rules.length === 0 ? (
                    <EmptyState
                        icon={<Settings2 className="h-6 w-6 text-muted-foreground" />}
                        title={t('No alert rules configured')}
                        description={t('Create rules to automatically detect and alert on sensor anomalies')}
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
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {rules.map((rule) => (
                            <RuleCard key={rule.id} rule={rule} siteId={site.id} />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function RuleCard({ rule, siteId }: { rule: AlertRule; siteId: number }) {
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
        <Card className={!rule.active ? 'opacity-60' : ''}>
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
                            <span className="font-medium">{cond.threshold}</span>
                            {cond.duration_minutes > 0 && (
                                <span className="text-muted-foreground">
                                    for {cond.duration_minutes}m
                                </span>
                            )}
                        </div>
                    ))}
                    {rule.conditions.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                            +{rule.conditions.length - 3} {t('more')}
                        </p>
                    )}
                </div>

                {rule.device && (
                    <p className="mt-2 text-xs text-muted-foreground">
                        {t('Device')}: {rule.device.name}
                    </p>
                )}

                <p className="mt-2 text-xs text-muted-foreground">
                    {t('Cooldown')}: {rule.cooldown_minutes}m
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
                            onClick={() =>
                                router.delete(`/sites/${siteId}/rules/${rule.id}`, {
                                    preserveScroll: true,
                                })
                            }
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </Can>
            </CardContent>
        </Card>
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
