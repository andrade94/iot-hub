import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('Recipes')}</h1>
                    <p className="text-sm text-muted-foreground">
                        {recipes.length} {t('sensor recipe(s) available')}
                    </p>
                </div>

                {groups.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed p-12">
                        <div className="text-center">
                            <FlaskConical className="mx-auto h-10 w-10 text-muted-foreground/50" />
                            <p className="mt-3 text-muted-foreground">{t('No recipes available')}</p>
                        </div>
                    </div>
                ) : (
                    groups.map((group) => (
                        <div key={group.module} className="space-y-3">
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                <h2 className="text-sm font-semibold">{group.module}</h2>
                                <Badge variant="secondary" className="text-xs">
                                    {group.recipes.length}
                                </Badge>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {group.recipes.map((recipe) => (
                                    <Card
                                        key={recipe.id}
                                        className="cursor-pointer transition-colors hover:bg-muted/50"
                                        onClick={() => router.get(`/recipes/${recipe.id}`)}
                                    >
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base">{recipe.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="font-mono text-xs">
                                                        {recipe.sensor_model}
                                                    </Badge>
                                                </div>
                                                {recipe.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                                        {recipe.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <FlaskConical className="h-3 w-3" />
                                                    {recipe.default_rules.length} {t('default rule(s)')}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </AppLayout>
    );
}
