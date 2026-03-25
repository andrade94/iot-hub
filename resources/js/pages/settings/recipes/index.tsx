import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FadeIn } from '@/components/ui/fade-in';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Recipe } from '@/types';
import { Head, router } from '@inertiajs/react';
import { BookOpen, FlaskConical } from 'lucide-react';

interface Props {
    recipes: Recipe[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Recipes', href: '/recipes' },
];

export default function RecipeIndex({ recipes }: Props) {
    const { t } = useLang();

    // Group by module
    const grouped = recipes.reduce<Record<string, { module: string; recipes: Recipe[] }>>((acc, recipe) => {
        const moduleName = recipe.module?.name ?? 'Other';
        if (!acc[moduleName]) {
            acc[moduleName] = { module: moduleName, recipes: [] };
        }
        acc[moduleName].recipes.push(recipe);
        return acc;
    }, {});

    const groups = Object.values(grouped);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Recipes')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative p-6 md:p-8">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Recipe Library')}
                            </p>
                            <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                {t('Recipes')}
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                <span className="font-mono font-medium tabular-nums text-foreground">
                                    {recipes.length}
                                </span>{' '}
                                {t('sensor recipe(s) available')}
                            </p>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Recipe Groups ───────────────────────────────── */}
                {groups.length === 0 ? (
                    <FadeIn delay={100} duration={500}>
                        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed p-12">
                            <div className="text-center">
                                <FlaskConical className="mx-auto h-10 w-10 text-muted-foreground/50" />
                                <p className="mt-3 text-muted-foreground">{t('No recipes available')}</p>
                            </div>
                        </div>
                    </FadeIn>
                ) : (
                    groups.map((group, groupIdx) => (
                        <FadeIn key={group.module} delay={100 + groupIdx * 100} duration={500}>
                            <div className="space-y-3">
                                {/* Section divider */}
                                <div className="flex items-center gap-3">
                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                        {group.module}
                                    </p>
                                    <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                                        {group.recipes.length}
                                    </Badge>
                                    <div className="h-px flex-1 bg-border" />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {group.recipes.map((recipe, recipeIdx) => (
                                        <FadeIn
                                            key={recipe.id}
                                            delay={150 + groupIdx * 100 + recipeIdx * 60}
                                            duration={500}
                                        >
                                            <Card
                                                className="cursor-pointer shadow-elevation-1 transition-colors hover:bg-muted/50"
                                                onClick={() => router.get(`/recipes/${recipe.id}`)}
                                            >
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-base">{recipe.name}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                variant="outline"
                                                                className="font-mono text-xs tabular-nums"
                                                            >
                                                                {recipe.sensor_model}
                                                            </Badge>
                                                        </div>
                                                        {recipe.description && (
                                                            <p className="line-clamp-2 text-sm text-muted-foreground">
                                                                {recipe.description}
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <FlaskConical className="h-3 w-3" />
                                                            <span className="font-mono tabular-nums">
                                                                {recipe.default_rules.length}
                                                            </span>{' '}
                                                            {t('default rule(s)')}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </FadeIn>
                                    ))}
                                </div>
                            </div>
                        </FadeIn>
                    ))
                )}
            </div>
        </AppLayout>
    );
}
