import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DetailCard } from '@/components/ui/detail-card';
import { FadeIn } from '@/components/ui/fade-in';
import { Progress } from '@/components/ui/progress';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Device, Site } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { isDeviceOnline } from '@/utils/device';
import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    BatteryFull,
    BatteryLow,
    BatteryMedium,
    Cpu,
    MapPin,
    Router,
    Signal,
    SignalLow,
    SignalMedium,
} from 'lucide-react';

interface Props {
    site: Site;
    device: Device;
}

export default function DeviceShow({ site, device }: Props) {
    const { t } = useLang();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sites', href: '/settings/sites' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Devices', href: `/sites/${site.id}/devices` },
        { title: device.name, href: '#' },
    ];

    const online = isDeviceOnline(device.last_reading_at);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${device.name} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header card with bg-dots ── */}
                <FadeIn>
                    <Card className="shadow-elevation-1 overflow-hidden">
                        <div className="bg-dots relative border-b px-6 py-5">
                            <div className="flex items-start gap-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => router.get(`/sites/${site.id}/devices`)}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <div className="flex-1">
                                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                        {t('Device Detail')}
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-3">
                                        <span
                                            className={`h-2.5 w-2.5 rounded-full ${
                                                online
                                                    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                                                    : 'bg-zinc-300 dark:bg-zinc-600'
                                            }`}
                                        />
                                        <h1 className="font-display text-2xl font-bold tracking-tight">
                                            {device.name}
                                        </h1>
                                        <DeviceStatusBadge status={device.status} />
                                    </div>
                                    <p className="mt-1 font-mono text-sm tabular-nums text-muted-foreground">
                                        {device.model} · {device.dev_eui}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </FadeIn>

                {/* ── Info cards row ── */}
                <FadeIn delay={80}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <InfoCard
                            icon={<BatteryIcon pct={device.battery_pct} />}
                            label={t('Battery')}
                            value={
                                device.battery_pct !== null ? (
                                    <span className="font-mono tabular-nums">{device.battery_pct}%</span>
                                ) : (
                                    '—'
                                )
                            }
                        >
                            {device.battery_pct !== null && (
                                <Progress
                                    value={device.battery_pct}
                                    size="sm"
                                    variant={
                                        device.battery_pct < 20
                                            ? 'destructive'
                                            : device.battery_pct < 40
                                              ? 'warning'
                                              : 'success'
                                    }
                                    className="mt-1"
                                />
                            )}
                        </InfoCard>
                        <InfoCard
                            icon={<SignalIcon rssi={device.rssi} />}
                            label={t('Signal (RSSI)')}
                            value={
                                device.rssi !== null ? (
                                    <span className="font-mono tabular-nums">{device.rssi} dBm</span>
                                ) : (
                                    '—'
                                )
                            }
                        />
                        <InfoCard
                            icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                            label={t('Zone')}
                            value={device.zone || '—'}
                        />
                        <InfoCard
                            icon={<Cpu className="h-4 w-4 text-muted-foreground" />}
                            label={t('Last Seen')}
                            value={
                                device.last_reading_at ? (
                                    <span className="font-mono tabular-nums">
                                        {formatTimeAgo(device.last_reading_at)}
                                    </span>
                                ) : (
                                    '—'
                                )
                            }
                        />
                    </div>
                </FadeIn>

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    {/* ── Main content ── */}
                    <div className="space-y-6">
                        {/* Gateway info */}
                        {device.gateway && (
                            <FadeIn delay={140}>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                            {t('Gateway')}
                                        </p>
                                        <div className="h-px flex-1 bg-border" />
                                    </div>
                                    <Card className="shadow-elevation-1">
                                        <CardContent className="p-4">
                                            <div
                                                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                                                onClick={() =>
                                                    router.get(
                                                        `/sites/${site.id}/gateways/${device.gateway!.id}`,
                                                    )
                                                }
                                            >
                                                <Router className="h-5 w-5 text-muted-foreground" />
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {device.gateway.model}
                                                    </p>
                                                    <p className="font-mono text-xs tabular-nums text-muted-foreground">
                                                        {device.gateway.serial}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant={
                                                        device.gateway.status === 'online'
                                                            ? 'success'
                                                            : 'outline'
                                                    }
                                                    className="ml-auto text-xs"
                                                >
                                                    {device.gateway.status}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </FadeIn>
                        )}

                        {/* Recipe info */}
                        {device.recipe && (
                            <FadeIn delay={200}>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                            {t('Recipe')}
                                        </p>
                                        <div className="h-px flex-1 bg-border" />
                                    </div>
                                    <Card className="shadow-elevation-1">
                                        <CardContent className="p-4">
                                            <div
                                                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                                                onClick={() =>
                                                    router.get(`/recipes/${device.recipe!.id}`)
                                                }
                                            >
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {device.recipe.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {device.recipe.sensor_model} ·{' '}
                                                        <span className="font-mono tabular-nums">
                                                            {device.recipe.default_rules.length}
                                                        </span>{' '}
                                                        {t('rules')}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </FadeIn>
                        )}
                    </div>

                    {/* ── DETAILS sidebar ── */}
                    <FadeIn delay={260}>
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
                                    { label: t('Name'), value: device.name },
                                    { label: t('Model'), value: device.model },
                                    { label: t('DevEUI'), value: <span className="font-mono tabular-nums">{device.dev_eui}</span> },
                                    { label: t('Status'), value: device.status },
                                    { label: t('Zone'), value: device.zone || '—' },
                                    { label: t('Battery'), value: <span className="font-mono tabular-nums">{device.battery_pct !== null ? `${device.battery_pct}%` : '—'}</span> },
                                    { label: t('RSSI'), value: <span className="font-mono tabular-nums">{device.rssi !== null ? `${device.rssi} dBm` : '—'}</span> },
                                    { label: t('Last Reading'), value: <span className="font-mono tabular-nums">{device.last_reading_at ? new Date(device.last_reading_at).toLocaleString() : '—'}</span> },
                                    ...(device.provisioned_at ? [{ label: t('Provisioned'), value: <span className="font-mono tabular-nums">{new Date(device.provisioned_at).toLocaleDateString()}</span> }] : []),
                                    { label: t('Installed'), value: <span className="font-mono tabular-nums">{device.installed_at ? new Date(device.installed_at).toLocaleDateString() : '—'}</span> },
                                    { label: t('Registered'), value: <span className="font-mono tabular-nums">{new Date(device.created_at).toLocaleDateString()}</span> },
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

function InfoCard({
    icon,
    label,
    value,
    children,
}: {
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    children?: React.ReactNode;
}) {
    return (
        <Card className="shadow-elevation-1">
            <div className="p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {icon}
                    {label}
                </div>
                <p className="mt-1 text-sm font-medium">{value}</p>
                {children}
            </div>
        </Card>
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
    return <Badge variant={variants[status] ?? 'outline'}>{status}</Badge>;
}

function BatteryIcon({ pct }: { pct: number | null }) {
    if (pct === null) return <Cpu className="h-4 w-4 text-muted-foreground" />;
    const Icon = pct < 20 ? BatteryLow : pct < 60 ? BatteryMedium : BatteryFull;
    const color = pct < 20 ? 'text-destructive' : pct < 40 ? 'text-amber-500' : 'text-emerald-500';
    return <Icon className={`h-4 w-4 ${color}`} />;
}

function SignalIcon({ rssi }: { rssi: number | null }) {
    if (rssi === null) return <Signal className="h-4 w-4 text-muted-foreground" />;
    const Icon = rssi > -70 ? Signal : rssi > -90 ? SignalMedium : SignalLow;
    const color =
        rssi > -70 ? 'text-emerald-500' : rssi > -90 ? 'text-amber-500' : 'text-destructive';
    return <Icon className={`h-4 w-4 ${color}`} />;
}
