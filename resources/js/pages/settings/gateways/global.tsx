import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Skeleton } from '@/components/ui/skeleton';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Gateway, Site } from '@/types';
import { Head, router } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';

interface GatewayWithSite extends Gateway {
    site?: Pick<Site, 'id' | 'name'>;
    devices_count: number;
}

interface PaginatedGateways {
    data: GatewayWithSite[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface Props {
    gateways: PaginatedGateways;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Gateways', href: '/settings/gateways' },
];

function GatewayStatusBadge({ status }: { status: string }) {
    const v: Record<string, 'success' | 'destructive' | 'outline'> = {
        online: 'success',
        offline: 'destructive',
        registered: 'outline',
    };
    return <Badge variant={v[status] ?? 'outline'} className="text-xs">{status}</Badge>;
}

export default function GatewayGlobalIndex({ gateways }: Props) {
    const { t } = useLang();

    const columns = useMemo<ColumnDef<GatewayWithSite>[]>(() => [
        {
            accessorKey: 'model',
            header: t('Model'),
            cell: ({ row }) => <span className="font-medium">{row.original.model}</span>,
        },
        {
            accessorKey: 'serial',
            header: t('Serial'),
            cell: ({ row }) => <span className="font-mono text-xs">{row.original.serial}</span>,
        },
        {
            id: 'site',
            header: t('Site'),
            cell: ({ row }) => row.original.site?.name ?? '—',
        },
        {
            id: 'devices',
            header: t('Devices'),
            cell: ({ row }) => (
                <span className="font-mono tabular-nums">{row.original.devices_count}</span>
            ),
        },
        {
            accessorKey: 'status',
            header: t('Status'),
            cell: ({ row }) => <GatewayStatusBadge status={row.original.status} />,
        },
        {
            id: 'type',
            header: t('Type'),
            cell: ({ row }) => (
                <Badge variant={row.original.is_addon ? 'outline' : 'secondary'} className="text-xs">
                    {row.original.is_addon ? t('Add-on') : t('Primary')}
                </Badge>
            ),
        },
    ], [t]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Gateways')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative p-6 md:p-8">
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t('Infrastructure')}
                            </p>
                            <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                {t('Gateways')}
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                <span className="font-mono font-medium text-foreground">{gateways.total}</span>{' '}
                                {t('gateways across all sites')}
                            </p>
                        </div>
                    </div>
                </FadeIn>

                <FadeIn delay={100} duration={500}>
                    <Card className="shadow-elevation-1">
                        <DataTable
                            columns={columns}
                            data={gateways.data}
                            bordered={false}
                            onRowClick={(gw) => {
                                if (gw.site) {
                                    router.get(`/sites/${gw.site.id}/gateways/${gw.id}`);
                                }
                            }}
                            emptyState={
                                <EmptyState
                                    size="sm"
                                    variant="muted"
                                    icon={<Radio className="h-5 w-5 text-muted-foreground" />}
                                    title={t('No gateways found')}
                                    description={t('Register gateways during site onboarding')}
                                />
                            }
                        />

                        {gateways.last_page > 1 && (
                            <div className="flex items-center justify-between border-t px-4 py-3">
                                <p className="text-xs text-muted-foreground">
                                    {t('Page')}{' '}
                                    <span className="font-mono font-medium tabular-nums text-foreground">
                                        {gateways.current_page}
                                    </span>{' '}
                                    {t('of')}{' '}
                                    <span className="font-mono tabular-nums">{gateways.last_page}</span>
                                </p>
                                <div className="flex gap-1">
                                    <Button variant="outline" size="icon-sm" disabled={!gateways.prev_page_url} onClick={() => gateways.prev_page_url && router.get(gateways.prev_page_url, {}, { preserveState: true })}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon-sm" disabled={!gateways.next_page_url} onClick={() => gateways.next_page_url && router.get(gateways.next_page_url, {}, { preserveState: true })}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                </FadeIn>
            </div>
        </AppLayout>
    );
}
