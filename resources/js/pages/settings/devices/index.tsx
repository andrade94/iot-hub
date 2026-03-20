import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Device, Site } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    BatteryLow,
    BatteryMedium,
    BatteryFull,
    ChevronLeft,
    ChevronRight,
    Cpu,
    Search,
    Signal,
    SignalLow,
    SignalMedium,
    WifiOff,
    Plus,
} from 'lucide-react';
import { useState } from 'react';

interface PaginatedDevices {
    data: Device[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface Props {
    site: Site;
    devices: PaginatedDevices;
    zones: string[];
    filters: {
        status?: string;
        zone?: string;
        search?: string;
    };
}

export default function DeviceIndex({ site, devices, zones, filters }: Props) {
    const { t } = useLang();
    const [search, setSearch] = useState(filters.search ?? '');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Sites', href: '/settings/sites' },
        { title: site.name, href: `/sites/${site.id}` },
        { title: 'Devices', href: '#' },
    ];

    function applyFilter(key: string, value: string | undefined) {
        const params: Record<string, string> = { ...filters };
        if (value && value !== 'all') {
            params[key] = value;
        } else {
            delete params[key];
        }
        router.get(`/sites/${site.id}/devices`, params, {
            preserveState: true,
            replace: true,
        });
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        applyFilter('search', search || undefined);
    }

    // Stats
    const totalDevices = devices.total;
    const onlineCount = devices.data.filter((d) => isOnline(d)).length;
    const offlineCount = devices.data.filter((d) => !isOnline(d) && d.status === 'active').length;
    const lowBatteryCount = devices.data.filter(
        (d) => d.battery_pct !== null && d.battery_pct < 20,
    ).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Devices')} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{t('Devices')}</h1>
                        <p className="text-sm text-muted-foreground">
                            {site.name} — {totalDevices} {t('device(s)')}
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={`/sites/${site.id}/devices?add=true`}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('Add Device')}
                        </Link>
                    </Button>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <MiniStat label={t('Total')} value={totalDevices} icon={<Cpu className="h-4 w-4" />} />
                    <MiniStat
                        label={t('Online')}
                        value={onlineCount}
                        icon={<Signal className="h-4 w-4 text-emerald-500" />}
                    />
                    <MiniStat
                        label={t('Offline')}
                        value={offlineCount}
                        icon={<WifiOff className="h-4 w-4 text-destructive" />}
                    />
                    <MiniStat
                        label={t('Low Battery')}
                        value={lowBatteryCount}
                        icon={<BatteryLow className="h-4 w-4 text-amber-500" />}
                    />
                </div>

                {/* Filters */}
                <Card>
                    <CardContent className="p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        className="pl-9"
                                        placeholder={t('Search by name, DevEUI, or model...')}
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <Button type="submit" variant="secondary" size="sm">
                                    {t('Search')}
                                </Button>
                            </form>
                            <div className="flex gap-2">
                                <Select
                                    value={filters.status ?? 'all'}
                                    onValueChange={(v) => applyFilter('status', v)}
                                >
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue placeholder={t('Status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Status')}</SelectItem>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="offline">{t('Offline')}</SelectItem>
                                        <SelectItem value="pending">{t('Pending')}</SelectItem>
                                        <SelectItem value="provisioned">{t('Provisioned')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {zones.length > 0 && (
                                    <Select
                                        value={filters.zone ?? 'all'}
                                        onValueChange={(v) => applyFilter('zone', v)}
                                    >
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue placeholder={t('Zone')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Zones')}</SelectItem>
                                            {zones.map((z) => (
                                                <SelectItem key={z} value={z}>
                                                    {z}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Device Table */}
                <Card className="flex-1">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('Device')}</TableHead>
                                <TableHead>{t('Model')}</TableHead>
                                <TableHead className="hidden md:table-cell">{t('DevEUI')}</TableHead>
                                <TableHead>{t('Zone')}</TableHead>
                                <TableHead>{t('Status')}</TableHead>
                                <TableHead>{t('Battery')}</TableHead>
                                <TableHead className="hidden lg:table-cell">{t('Signal')}</TableHead>
                                <TableHead>{t('Last Seen')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {devices.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-0">
                                        <EmptyState
                                            size="sm"
                                            variant="muted"
                                            className="border-0"
                                            icon={<Cpu className="h-5 w-5 text-muted-foreground" />}
                                            title={t('No devices')}
                                            description={t('Add devices to this site to start monitoring')}
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                devices.data.map((device) => (
                                    <TableRow
                                        key={device.id}
                                        className="cursor-pointer"
                                        onClick={() =>
                                            router.get(`/sites/${site.id}/devices/${device.id}`)
                                        }
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <OnlineIndicator online={isOnline(device)} />
                                                <span className="font-medium">{device.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono text-xs">
                                                {device.model}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                                            {device.dev_eui}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {device.zone || '—'}
                                        </TableCell>
                                        <TableCell>
                                            <DeviceStatusBadge status={device.status} />
                                        </TableCell>
                                        <TableCell>
                                            <BatteryIndicator pct={device.battery_pct} />
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell">
                                            <SignalIndicator rssi={device.rssi} />
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {device.last_reading_at
                                                ? formatTimeAgo(device.last_reading_at)
                                                : '—'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {devices.last_page > 1 && (
                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <p className="text-xs text-muted-foreground">
                                {t('Page')} {devices.current_page} {t('of')} {devices.last_page}
                            </p>
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    disabled={!devices.prev_page_url}
                                    onClick={() =>
                                        devices.prev_page_url &&
                                        router.get(devices.prev_page_url, {}, { preserveState: true })
                                    }
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    disabled={!devices.next_page_url}
                                    onClick={() =>
                                        devices.next_page_url &&
                                        router.get(devices.next_page_url, {}, { preserveState: true })
                                    }
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}

/* ── Sub-components ───────────────────────────────── */

function MiniStat({
    label,
    value,
    icon,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-3 rounded-lg border p-3">
            {icon}
            <div>
                <p className="text-xl font-bold tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
            </div>
        </div>
    );
}

function OnlineIndicator({ online }: { online: boolean }) {
    return (
        <span
            className={`h-2 w-2 shrink-0 rounded-full ${
                online ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-zinc-300 dark:bg-zinc-600'
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

function BatteryIndicator({ pct }: { pct: number | null }) {
    if (pct === null) return <span className="text-xs text-muted-foreground">—</span>;

    const Icon = pct < 20 ? BatteryLow : pct < 60 ? BatteryMedium : BatteryFull;
    const color = pct < 20 ? 'text-destructive' : pct < 40 ? 'text-amber-500' : 'text-emerald-500';
    const variant = pct < 20 ? 'destructive' : pct < 40 ? 'warning' : 'success';

    return (
        <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <div className="w-12">
                <Progress value={pct} size="sm" variant={variant as 'destructive' | 'warning' | 'success'} />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
        </div>
    );
}

function SignalIndicator({ rssi }: { rssi: number | null }) {
    if (rssi === null) return <span className="text-xs text-muted-foreground">—</span>;

    const Icon = rssi > -70 ? Signal : rssi > -90 ? SignalMedium : SignalLow;
    const color =
        rssi > -70 ? 'text-emerald-500' : rssi > -90 ? 'text-amber-500' : 'text-destructive';

    return (
        <div className="flex items-center gap-1.5">
            <Icon className={`h-3.5 w-3.5 ${color}`} />
            <span className="text-xs tabular-nums text-muted-foreground">{rssi} dBm</span>
        </div>
    );
}

function isOnline(device: Device): boolean {
    if (!device.last_reading_at) return false;
    const lastSeen = new Date(device.last_reading_at).getTime();
    return Date.now() - lastSeen < 15 * 60 * 1000;
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

export function DevicesIndexSkeleton() {
    return (
        <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-9 w-28" />
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                        <Skeleton className="h-4 w-4 rounded" />
                        <div className="space-y-1">
                            <Skeleton className="h-6 w-10" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Skeleton className="h-9 flex-1" />
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-[140px]" />
                            <Skeleton className="h-9 w-[140px]" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Device Table */}
            <Card className="flex-1">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-3 w-14" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-12" /></TableHead>
                            <TableHead className="hidden md:table-cell"><Skeleton className="h-3 w-14" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-10" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-14" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-14" /></TableHead>
                            <TableHead className="hidden lg:table-cell"><Skeleton className="h-3 w-12" /></TableHead>
                            <TableHead><Skeleton className="h-3 w-16" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-2 w-2 rounded-full" />
                                        <Skeleton className="h-4 w-28" />
                                    </div>
                                </TableCell>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell className="hidden md:table-cell"><Skeleton className="h-3 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-4 w-4" />
                                        <Skeleton className="h-1.5 w-12" />
                                        <Skeleton className="h-3 w-8" />
                                    </div>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                    <div className="flex items-center gap-1.5">
                                        <Skeleton className="h-3.5 w-3.5" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </TableCell>
                                <TableCell><Skeleton className="h-3 w-12" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
