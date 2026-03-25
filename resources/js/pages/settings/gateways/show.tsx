import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DetailCard } from '@/components/ui/detail-card';
import { FadeIn } from '@/components/ui/fade-in';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Device, Gateway, Site } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { isDeviceOnline } from '@/utils/device';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Cpu, Router } from 'lucide-react';

interface Props {
    site: Site;
    gateway: Gateway;
}

export default function GatewayShow({ site, gateway }: Props) {
    const { t } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sites', href: '/settings/sites' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Gateways', href: `/sites/${site.id}/gateways` },
        { title: gateway.model, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${gateway.model} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header card with bg-dots ── */}
                <FadeIn>
                    <Card className="shadow-elevation-1 overflow-hidden">
                        <div className="bg-dots relative border-b px-6 py-5">
                            <div className="flex items-start gap-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => router.get(`/sites/${site.id}/gateways`)}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <div className="flex-1">
                                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                        {t('Gateway Detail')}
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-3">
                                        <Router className="h-5 w-5 text-muted-foreground" />
                                        <h1 className="font-display text-2xl font-bold tracking-tight">
                                            {gateway.model}
                                        </h1>
                                        <GatewayStatusBadge status={gateway.status} />
                                        {gateway.is_addon && (
                                            <Badge variant="secondary">{t('Add-on')}</Badge>
                                        )}
                                    </div>
                                    <p className="mt-1 font-mono text-sm tabular-nums text-muted-foreground">
                                        {gateway.serial}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </FadeIn>

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    {/* ── CONNECTED DEVICES section ── */}
                    <FadeIn delay={100}>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                    {t('Connected Devices')}
                                </p>
                                <div className="h-px flex-1 bg-border" />
                                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                    {gateway.devices?.length ?? 0}
                                </span>
                            </div>

                            <Card className="shadow-elevation-1">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Device')}</TableHead>
                                            <TableHead>{t('Model')}</TableHead>
                                            <TableHead>{t('Zone')}</TableHead>
                                            <TableHead>{t('Status')}</TableHead>
                                            <TableHead>{t('Last Seen')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {!gateway.devices || gateway.devices.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-12 text-center">
                                                    <Cpu className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                                    <p className="mt-2 text-sm text-muted-foreground">
                                                        {t('No devices connected to this gateway')}
                                                    </p>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            gateway.devices.map((device) => (
                                                <TableRow
                                                    key={device.id}
                                                    className="cursor-pointer"
                                                    onClick={() =>
                                                        router.get(`/sites/${site.id}/devices/${device.id}`)
                                                    }
                                                >
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <OnlineIndicator
                                                                online={isDeviceOnline(device.last_reading_at)}
                                                            />
                                                            <span className="font-medium">{device.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="font-mono text-xs">
                                                            {device.model}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {device.zone || '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <DeviceStatusBadge status={device.status} />
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                                                        {device.last_reading_at
                                                            ? formatTimeAgo(device.last_reading_at)
                                                            : '—'}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    </FadeIn>

                    {/* ── DETAILS sidebar ── */}
                    <FadeIn delay={200}>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                    {t('Details')}
                                </p>
                                <div className="h-px flex-1 bg-border" />
                            </div>

                            <DetailCard
                                className="shadow-elevation-1"
                                items={[
                                    { label: t('Model'), value: gateway.model },
                                    { label: t('Serial'), value: <span className="font-mono tabular-nums">{gateway.serial}</span> },
                                    { label: t('Status'), value: gateway.status },
                                    { label: t('Type'), value: gateway.is_addon ? t('Add-on') : t('Primary') },
                                    ...(gateway.chirpstack_id ? [{ label: t('ChirpStack ID'), value: <span className="font-mono tabular-nums">{gateway.chirpstack_id}</span> }] : []),
                                    { label: t('Last Seen'), value: <span className="font-mono tabular-nums">{gateway.last_seen_at ? new Date(gateway.last_seen_at).toLocaleString() : '—'}</span> },
                                    { label: t('Registered'), value: <span className="font-mono tabular-nums">{new Date(gateway.created_at).toLocaleDateString()}</span> },
                                ]}
                            />
                        </div>
                    </FadeIn>
                </div>
            </div>
        </AppLayout>
    );
}

/* ── Sub-components ──────────────────────────────── */

function GatewayStatusBadge({ status }: { status: string }) {
    const variants: Record<string, 'success' | 'destructive' | 'outline'> = {
        online: 'success',
        offline: 'destructive',
        registered: 'outline',
    };
    return (
        <Badge variant={variants[status] ?? 'outline'}>{status}</Badge>
    );
}

function OnlineIndicator({ online }: { online: boolean }) {
    return (
        <span
            className={`h-2 w-2 shrink-0 rounded-full ${
                online
                    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                    : 'bg-zinc-300 dark:bg-zinc-600'
            }`}
        />
    );
}

function DeviceStatusBadge({ status }: { status: string }) {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'outline' | 'info'> = {
        active: 'success',
        provisioned: 'info',
        pending: 'warning',
        offline: 'destructive',
        maintenance: 'outline',
    };
    return (
        <Badge variant={variants[status] ?? 'outline'} className="text-xs">
            {status}
        </Badge>
    );
}
