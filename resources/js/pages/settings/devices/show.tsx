import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Device, Site } from '@/types';
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

    const online = isOnline(device);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${device.name} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.get(`/sites/${site.id}/devices`)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                            <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                    online ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-zinc-300 dark:bg-zinc-600'
                                }`}
                            />
                            <h1 className="text-2xl font-bold tracking-tight">{device.name}</h1>
                            <DeviceStatusBadge status={device.status} />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {device.model} · {device.dev_eui}
                        </p>
                    </div>
                </div>

                {/* Info cards row */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <InfoCard
                        icon={<BatteryIcon pct={device.battery_pct} />}
                        label={t('Battery')}
                        value={device.battery_pct !== null ? `${device.battery_pct}%` : '—'}
                    >
                        {device.battery_pct !== null && (
                            <Progress
                                value={device.battery_pct}
                                size="sm"
                                variant={device.battery_pct < 20 ? 'destructive' : device.battery_pct < 40 ? 'warning' : 'success'}
                                className="mt-1"
                            />
                        )}
                    </InfoCard>
                    <InfoCard
                        icon={<SignalIcon rssi={device.rssi} />}
                        label={t('Signal (RSSI)')}
                        value={device.rssi !== null ? `${device.rssi} dBm` : '—'}
                    />
                    <InfoCard
                        icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
                        label={t('Zone')}
                        value={device.zone || '—'}
                    />
                    <InfoCard
                        icon={<Cpu className="h-4 w-4 text-muted-foreground" />}
                        label={t('Last Seen')}
                        value={device.last_reading_at ? formatTimeAgo(device.last_reading_at) : '—'}
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    {/* Main content */}
                    <div className="space-y-6">
                        {/* Gateway info */}
                        {device.gateway && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('Gateway')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div
                                        className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                                        onClick={() => router.get(`/sites/${site.id}/gateways/${device.gateway!.id}`)}
                                    >
                                        <Router className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">{device.gateway.model}</p>
                                            <p className="text-xs text-muted-foreground">{device.gateway.serial}</p>
                                        </div>
                                        <Badge variant={device.gateway.status === 'online' ? 'success' : 'outline'} className="ml-auto text-xs">
                                            {device.gateway.status}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Recipe info */}
                        {device.recipe && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('Recipe')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div
                                        className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                                        onClick={() => router.get(`/recipes/${device.recipe!.id}`)}
                                    >
                                        <div>
                                            <p className="text-sm font-medium">{device.recipe.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {device.recipe.sensor_model} · {device.recipe.default_rules.length} {t('rules')}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Details sidebar */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Details')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <DetailRow label={t('Name')} value={device.name} />
                                <DetailRow label={t('Model')} value={device.model} />
                                <DetailRow label={t('DevEUI')} value={device.dev_eui} />
                                <DetailRow label={t('Status')} value={device.status} />
                                <DetailRow label={t('Zone')} value={device.zone || '—'} />
                                <DetailRow
                                    label={t('Battery')}
                                    value={device.battery_pct !== null ? `${device.battery_pct}%` : '—'}
                                />
                                <DetailRow
                                    label={t('RSSI')}
                                    value={device.rssi !== null ? `${device.rssi} dBm` : '—'}
                                />
                                <DetailRow
                                    label={t('Last Reading')}
                                    value={device.last_reading_at ? new Date(device.last_reading_at).toLocaleString() : '—'}
                                />
                                {device.provisioned_at && (
                                    <DetailRow
                                        label={t('Provisioned')}
                                        value={new Date(device.provisioned_at).toLocaleDateString()}
                                    />
                                )}
                                <DetailRow
                                    label={t('Installed')}
                                    value={device.installed_at ? new Date(device.installed_at).toLocaleDateString() : '—'}
                                />
                                <DetailRow
                                    label={t('Registered')}
                                    value={new Date(device.created_at).toLocaleDateString()}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function InfoCard({
    icon,
    label,
    value,
    children,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="rounded-lg border p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {icon}
                {label}
            </div>
            <p className="mt-1 text-sm font-medium">{value}</p>
            {children}
        </div>
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
    const color = rssi > -70 ? 'text-emerald-500' : rssi > -90 ? 'text-amber-500' : 'text-destructive';
    return <Icon className={`h-4 w-4 ${color}`} />;
}

function isOnline(device: Device): boolean {
    if (!device.last_reading_at) return false;
    return Date.now() - new Date(device.last_reading_at).getTime() < 15 * 60 * 1000;
}

function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
