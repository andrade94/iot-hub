import { Can } from '@/components/Can';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import { useValidatedForm } from '@/hooks/use-validated-form';
import AppLayout from '@/layouts/app-layout';
import type { ApiKeyRecord, BreadcrumbItem } from '@/types';
import { apiKeySchema } from '@/utils/schemas';
import { Head, router } from '@inertiajs/react';
import { Key, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    apiKeys: ApiKeyRecord[];
    newKey?: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'API Keys', href: '#' },
];

export default function ApiKeysPage({ apiKeys, newKey }: Props) {
    const { t } = useLang();
    const [showForm, setShowForm] = useState(false);
    const [deleteKey, setDeleteKey] = useState<ApiKeyRecord | null>(null);

    const form = useValidatedForm(apiKeySchema, {
        name: '',
        rate_limit: 60,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.validate()) return;
        form.post('/settings/api-keys', {
            preserveScroll: true,
            onSuccess: () => { form.reset(); setShowForm(false); },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('API Keys')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('API Keys')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('API Keys')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono font-medium tabular-nums text-foreground">
                                        {apiKeys.length}
                                    </span>{' '}
                                    {t('key(s)')}
                                </p>
                            </div>
                            <Can permission="manage org settings">
                                <Button onClick={() => setShowForm(!showForm)}>
                                    <Plus className="mr-2 h-4 w-4" />{t('New Key')}
                                </Button>
                            </Can>
                        </div>
                    </div>
                </FadeIn>

                {/* ── Newly created key ──────────────────────────── */}
                {newKey && (
                    <FadeIn delay={80} duration={400}>
                        <Card className="border-emerald-500/50 bg-emerald-50 shadow-elevation-1 dark:bg-emerald-950/20">
                            <CardContent className="p-4">
                                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                    {t('New API key created! Copy it now — it won\'t be shown again.')}
                                </p>
                                <code className="mt-2 block rounded bg-background p-2 font-mono text-sm tabular-nums">
                                    {newKey}
                                </code>
                            </CardContent>
                        </Card>
                    </FadeIn>
                )}

                {/* ── Create form ────────────────────────────────── */}
                {showForm && (
                    <FadeIn delay={80} duration={400}>
                        <Card className="shadow-elevation-1">
                            <CardHeader>
                                <CardTitle className="text-base">{t('Create API Key')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('Name')}</Label>
                                        <Input
                                            value={form.data.name}
                                            onChange={(e) => form.setData('name', e.target.value)}
                                            placeholder={t('e.g. Production')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Rate Limit (req/min)')}</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={1000}
                                            value={form.data.rate_limit}
                                            onChange={(e) => form.setData('rate_limit', Number(e.target.value))}
                                            className="w-[120px] font-mono tabular-nums"
                                        />
                                    </div>
                                    <Button type="submit" disabled={form.processing || !form.data.name}>
                                        <Key className="mr-2 h-4 w-4" />{t('Create')}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </FadeIn>
                )}

                {/* ── Keys table ─────────────────────────────────── */}
                <FadeIn delay={150} duration={500}>
                    <div>
                        <div className="mb-3 flex items-center gap-3">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Keys')}
                            </p>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                        <Card className="shadow-elevation-1">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Name')}</TableHead>
                                        <TableHead>{t('Key Prefix')}</TableHead>
                                        <TableHead>{t('Permissions')}</TableHead>
                                        <TableHead>{t('Rate Limit')}</TableHead>
                                        <TableHead>{t('Last Used')}</TableHead>
                                        <TableHead>{t('Active')}</TableHead>
                                        <TableHead />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {apiKeys.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                                                {t('No API keys')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        apiKeys.map((key) => (
                                            <TableRow key={key.id}>
                                                <TableCell className="font-medium">{key.name}</TableCell>
                                                <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                                                    {key.key_prefix}...
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {key.permissions?.slice(0, 3).map((p) => (
                                                            <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                                                        ))}
                                                        {(key.permissions?.length ?? 0) > 3 && (
                                                            <Badge variant="outline" className="text-[10px]">
                                                                +{(key.permissions?.length ?? 0) - 3}
                                                            </Badge>
                                                        )}
                                                        {!key.permissions && (
                                                            <span className="text-xs text-muted-foreground">{t('All')}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm tabular-nums">
                                                    {key.rate_limit}/min
                                                </TableCell>
                                                <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                                                    {key.last_used_at
                                                        ? new Date(key.last_used_at).toLocaleDateString()
                                                        : '\u2014'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={key.active ? 'success' : 'outline'}
                                                        className="text-xs"
                                                    >
                                                        {key.active ? t('Active') : t('Inactive')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Can permission="manage org settings">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            className="text-destructive"
                                                            onClick={() => setDeleteKey(key)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </Can>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>
                </FadeIn>

                <ConfirmationDialog
                    open={!!deleteKey}
                    onOpenChange={(open) => !open && setDeleteKey(null)}
                    title={t('Delete API Key')}
                    description={t(`Are you sure you want to delete the API key "${deleteKey?.name}"?`)}
                    warningMessage={t('This action cannot be undone. Any integrations using this key will stop working.')}
                    onConfirm={() => {
                        if (deleteKey) {
                            router.delete(`/settings/api-keys/${deleteKey.id}`, {
                                preserveScroll: true,
                                onSuccess: () => setDeleteKey(null),
                            });
                        }
                    }}
                    actionLabel={t('Delete')}
                />
            </div>
        </AppLayout>
    );
}
