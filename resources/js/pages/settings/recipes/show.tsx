import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import InputError from '@/components/input-error';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { AlertRuleCondition, BreadcrumbItem, Recipe, Site, SiteRecipeOverride } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, FlaskConical, Save, ShieldAlert } from 'lucide-react';

interface Props {
    recipe: Recipe;
    sites: Pick<Site, 'id' | 'name'>[];
    overrides: SiteRecipeOverride[];
}

export default function RecipeShow({ recipe, sites, overrides }: Props) {
    const { t } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Recipes', href: '/recipes' },
        { title: recipe.name, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={recipe.name} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.get('/recipes')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                            <FlaskConical className="h-5 w-5 text-muted-foreground" />
                            <h1 className="text-2xl font-bold tracking-tight">{recipe.name}</h1>
                        </div>
                        {recipe.description && (
                            <p className="mt-1 text-sm text-muted-foreground">{recipe.description}</p>
                        )}
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6">
                        {/* Default rules table */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    {t('Default Alert Rules')} ({recipe.default_rules.length})
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
                                    {recipe.default_rules.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                                                {t('No default rules defined')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        recipe.default_rules.map((rule, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">{rule.metric}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">
                                                        {rule.condition}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono tabular-nums">{rule.threshold}</TableCell>
                                                <TableCell className="text-sm">
                                                    {rule.duration_minutes > 0
                                                        ? `${rule.duration_minutes} ${t('min')}`
                                                        : t('Instant')}
                                                </TableCell>
                                                <TableCell>
                                                    <SeverityBadge severity={rule.severity} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Card>

                        {/* Override Thresholds section */}
                        {recipe.editable && sites.length > 0 && (
                            <OverrideThresholdsEditor
                                recipe={recipe}
                                sites={sites}
                                overrides={overrides}
                            />
                        )}

                        {/* Existing overrides */}
                        {overrides.length > 0 && (
                            <ExistingOverrides
                                overrides={overrides}
                                sites={sites}
                                defaultRules={recipe.default_rules}
                            />
                        )}
                    </div>

                    {/* Details sidebar */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Details')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <DetailRow label={t('Name')} value={recipe.name} />
                                <DetailRow
                                    label={t('Module')}
                                    value={recipe.module?.name ?? '--'}
                                />
                                <DetailRow label={t('Sensor Model')} value={recipe.sensor_model} />
                                <DetailRow
                                    label={t('Editable')}
                                    value={recipe.editable ? t('Yes') : t('No')}
                                />
                                <DetailRow
                                    label={t('Default Rules')}
                                    value={String(recipe.default_rules.length)}
                                />
                                <DetailRow
                                    label={t('Overrides')}
                                    value={String(overrides.length)}
                                />
                                <DetailRow
                                    label={t('Created')}
                                    value={new Date(recipe.created_at).toLocaleDateString()}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function OverrideThresholdsEditor({
    recipe,
    sites,
    overrides,
}: {
    recipe: Recipe;
    sites: Pick<Site, 'id' | 'name'>[];
    overrides: SiteRecipeOverride[];
}) {
    const { t } = useLang();

    const initialRules = recipe.default_rules.map((rule) => ({
        metric: rule.metric,
        condition: rule.condition,
        threshold: String(rule.threshold),
        duration_minutes: String(rule.duration_minutes),
        severity: rule.severity,
    }));

    const form = useForm({
        site_id: '',
        rules: initialRules,
    });

    function handleSiteChange(siteId: string): void {
        form.setData('site_id', siteId);

        const existingOverride = overrides.find((o) => String(o.site_id) === siteId);
        if (existingOverride) {
            form.setData('rules', existingOverride.overridden_rules.map((rule) => ({
                metric: rule.metric,
                condition: rule.condition,
                threshold: String(rule.threshold),
                duration_minutes: String(rule.duration_minutes),
                severity: rule.severity,
            })));
        } else {
            form.setData('rules', initialRules);
        }
    }

    function handleRuleChange(index: number, field: 'threshold' | 'duration_minutes', value: string): void {
        const updated = [...form.data.rules];
        updated[index] = { ...updated[index], [field]: value };
        form.setData('rules', updated);
    }

    function handleSubmit(e: React.FormEvent): void {
        e.preventDefault();
        form.post(`/recipes/${recipe.id}/overrides`, {
            onSuccess: () => form.clearErrors(),
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldAlert className="h-4 w-4" />
                    {t('Override Thresholds')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('Site')}</Label>
                        <Select value={form.data.site_id} onValueChange={handleSiteChange}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('Select a site to override')} />
                            </SelectTrigger>
                            <SelectContent>
                                {sites.map((site) => (
                                    <SelectItem key={site.id} value={String(site.id)}>
                                        {site.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={form.errors.site_id} />
                    </div>

                    {form.data.site_id && (
                        <>
                            <div className="rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Metric')}</TableHead>
                                            <TableHead>{t('Condition')}</TableHead>
                                            <TableHead>{t('Threshold')}</TableHead>
                                            <TableHead>{t('Duration (min)')}</TableHead>
                                            <TableHead>{t('Severity')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {form.data.rules.map((rule, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">{rule.metric}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">
                                                        {rule.condition}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        value={rule.threshold}
                                                        onChange={(e) => handleRuleChange(idx, 'threshold', e.target.value)}
                                                        className="h-8 w-24 font-mono tabular-nums"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={rule.duration_minutes}
                                                        onChange={(e) => handleRuleChange(idx, 'duration_minutes', e.target.value)}
                                                        className="h-8 w-20 font-mono tabular-nums"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <SeverityBadge severity={rule.severity} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <InputError message={form.errors.rules} />

                            <div className="flex justify-end">
                                <Button type="submit" disabled={form.processing}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {form.processing ? t('Saving...') : t('Save Overrides')}
                                </Button>
                            </div>
                        </>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}

function ExistingOverrides({
    overrides,
    sites,
    defaultRules,
}: {
    overrides: SiteRecipeOverride[];
    sites: Pick<Site, 'id' | 'name'>[];
    defaultRules: AlertRuleCondition[];
}) {
    const { t } = useLang();

    function getSiteName(siteId: number): string {
        return sites.find((s) => s.id === siteId)?.name ?? `Site #${siteId}`;
    }

    function isChanged(override: AlertRuleCondition, ruleIndex: number): boolean {
        const defaultRule = defaultRules[ruleIndex];
        if (!defaultRule) return false;
        return override.threshold !== defaultRule.threshold || override.duration_minutes !== defaultRule.duration_minutes;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">
                    {t('Existing Overrides')} ({overrides.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {overrides.map((override) => (
                    <div key={override.id} className="rounded-lg border p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h4 className="text-sm font-medium">{getSiteName(override.site_id)}</h4>
                            <span className="text-xs text-muted-foreground">
                                {new Date(override.updated_at).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            {override.overridden_rules.map((rule, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between text-sm"
                                >
                                    <span className="text-muted-foreground">{rule.metric}</span>
                                    <div className="flex items-center gap-3">
                                        <span className={`font-mono tabular-nums ${isChanged(rule, idx) ? 'font-semibold text-primary' : ''}`}>
                                            {rule.threshold}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {rule.duration_minutes > 0
                                                ? `${rule.duration_minutes} ${t('min')}`
                                                : t('Instant')}
                                        </span>
                                        <SeverityBadge severity={rule.severity} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
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
    const variants: Record<string, 'destructive' | 'warning' | 'info' | 'outline'> = {
        critical: 'destructive',
        high: 'warning',
        medium: 'info',
        low: 'outline',
    };
    return <Badge variant={variants[severity] ?? 'outline'} className="text-xs">{severity}</Badge>;
}
