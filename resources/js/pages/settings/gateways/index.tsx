import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Gateway, Site } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Eye, Plus, Router, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface PaginatedGateways {
    data: Gateway[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface Props {
    site: Site;
    gateways: PaginatedGateways;
}

export default function GatewayIndex({ site, gateways }: Props) {
    const { t } = useLang();
    const [showCreate, setShowCreate] = useState(false);
    const [deleteGateway, setDeleteGateway] = useState<Gateway | null>(null);
    const [deleting, setDeleting] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sites', href: '/settings/sites' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Gateways', href: '#' },
    ];

    function handleDelete() {
        if (!deleteGateway) return;
        setDeleting(true);
        router.delete(`/sites/${site.id}/gateways/${deleteGateway.id}`, {
            onFinish: () => {
                setDeleting(false);
                setDeleteGateway(null);
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Gateways')} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('Gateways')}</h1>
                        <p className="text-sm text-muted-foreground">
                            {site.name} — {gateways.total} {t('gateway(s)')}
                        </p>
                    </div>
                    <Dialog open={showCreate} onOpenChange={setShowCreate}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                {t('Add Gateway')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>{t('Add Gateway')}</DialogTitle>
                            </DialogHeader>
                            <GatewayForm siteId={site.id} onSuccess={() => setShowCreate(false)} />
                        </DialogContent>
                    </Dialog>
                </div>

                <Card className="flex-1">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Model')}</TableHead>
                                <TableHead>{t('Serial')}</TableHead>
                                <TableHead>{t('Devices')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead>{t('Type')}</TableHead>
                                <TableHead className="text-right">{t('Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {gateways.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-0">
                                        <EmptyState
                                            size="sm"
                                            variant="muted"
                                            className="border-0"
                                            icon={<Router className="h-5 w-5 text-muted-foreground" />}
                                            title={t('No gateways')}
                                            description={t('Register a gateway to connect your sensors')}
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                gateways.data.map((gw) => (
                                    <TableRow key={gw.id}>
                                        <TableCell className="font-medium">{gw.model}</TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{gw.serial}</TableCell>
                                        <TableCell className="tabular-nums">{gw.devices_count ?? 0}</TableCell>
                                        <TableCell>
                                            <GatewayStatusBadge status={gw.status} />
                                        </TableCell>
                                        <TableCell>
                                            {gw.is_addon ? (
                                                <Badge variant="secondary" className="text-xs">{t('Add-on')}</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs">{t('Primary')}</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title={t('View')}
                                                    onClick={() => router.get(`/sites/${site.id}/gateways/${gw.id}`)}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    title={t('Delete')}
                                                    onClick={() => setDeleteGateway(gw)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {gateways.last_page > 1 && (
                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <p className="text-xs text-muted-foreground">
                                {t('Page')} {gateways.current_page} {t('of')} {gateways.last_page}
                            </p>
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    disabled={!gateways.prev_page_url}
                                    onClick={() => gateways.prev_page_url && router.get(gateways.prev_page_url, {}, { preserveState: true })}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    disabled={!gateways.next_page_url}
                                    onClick={() => gateways.next_page_url && router.get(gateways.next_page_url, {}, { preserveState: true })}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>

                <ConfirmationDialog
                    open={!!deleteGateway}
                    onOpenChange={() => setDeleteGateway(null)}
                    title={t('Delete Gateway')}
                    description={t('Are you sure you want to delete this gateway? This action cannot be undone.')}
                    warningMessage={
                        deleteGateway && (deleteGateway.devices_count ?? 0) > 0
                            ? t('This gateway has :count connected device(s).', { count: deleteGateway.devices_count ?? 0 })
                            : undefined
                    }
                    loading={deleting}
                    onConfirm={handleDelete}
                    actionLabel={t('Delete')}
                />
            </div>
        </AppLayout>
    );
}

function GatewayForm({ siteId, onSuccess }: { siteId: number; onSuccess: () => void }) {
    const { t } = useLang();
    const form = useForm({
        model: '',
        serial: '',
        is_addon: false,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(`/sites/${siteId}/gateways`, {
            onSuccess: () => {
                form.reset();
                onSuccess();
            },
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="model">{t('Model')}</Label>
                <Input
                    id="model"
                    value={form.data.model}
                    onChange={(e) => form.setData('model', e.target.value)}
                    placeholder="e.g. RAK7268C"
                />
                {form.errors.model && <p className="text-xs text-destructive">{form.errors.model}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="serial">{t('Serial Number')}</Label>
                <Input
                    id="serial"
                    value={form.data.serial}
                    onChange={(e) => form.setData('serial', e.target.value)}
                    placeholder="e.g. AC1F09FFFE0A1234"
                />
                {form.errors.serial && <p className="text-xs text-destructive">{form.errors.serial}</p>}
            </div>
            <div className="flex items-center gap-2">
                <Switch
                    id="is_addon"
                    checked={form.data.is_addon}
                    onCheckedChange={(checked) => form.setData('is_addon', checked)}
                />
                <Label htmlFor="is_addon">{t('Add-on gateway')}</Label>
            </div>
            <Button type="submit" className="w-full" disabled={form.processing}>
                {form.processing ? t('Registering...') : t('Register Gateway')}
            </Button>
        </form>
    );
}

function GatewayStatusBadge({ status }: { status: string }) {
    const variants: Record<string, 'success' | 'destructive' | 'outline'> = {
        online: 'success',
        offline: 'destructive',
        registered: 'outline',
    };
    return <Badge variant={variants[status] ?? 'outline'} className="text-xs">{status}</Badge>;
}

export function GatewaysSkeleton() {
    return (
        <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-9 w-32" />
            </div>

            <Card className="flex-1">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-3 w-12" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-14" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-16" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-14" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-10" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-14" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-3 w-36" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        <Skeleton className="h-7 w-7 rounded-md" />
                                        <Skeleton className="h-7 w-7 rounded-md" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
