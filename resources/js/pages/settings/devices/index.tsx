import { Can } from '@/components/Can';
import { getSettingsDeviceColumns } from '@/components/settings-devices/columns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { FadeIn } from '@/components/ui/fade-in';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Device, Site } from '@/types';
import { isDeviceOnline } from '@/utils/device';
import { Head, Link, router } from '@inertiajs/react';
import {
    BatteryLow,
    ChevronLeft,
    ChevronRight,
    Cpu,
    Plus,
    Search,
    Signal,
    WifiOff,
} from 'lucide-react';
import { useMemo, useState } from 'react';

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

    const columns = useMemo(() => getSettingsDeviceColumns({ t }), [t]);

    function applyFilter(key: string, value: string | undefined) {
        const params: Record<string, string> = { ...filters };
        if (value && value !== 'all') {
            params[key] = value;
        } else {
            delete params[key];
        }
        router.get(`/sites/${site.id}/devices`, params, { preserveState: true, replace: true });
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        applyFilter('search', search || undefined);
    }

    const totalDevices = devices.total;
    const onlineCount = devices.data.filter((d) => isDeviceOnline(d.last_reading_at)).length;
    const offlineCount = devices.data.filter((d) => !isDeviceOnline(d.last_reading_at) && d.status === 'active').length;
    const lowBatteryCount = devices.data.filter((d) => d.battery_pct !== null && d.battery_pct < 20).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Devices')} — ${site.name}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <FadeIn>
                    <Card className="shadow-elevation-1 overflow-hidden">
                        <div className="bg-dots relative border-b px-6 py-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{t('Device Management')}</p>
                                    <h1 className="font-display mt-1 text-2xl font-bold tracking-tight">{site.name}</h1>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        <span className="font-mono tabular-nums">{totalDevices}</span> {t('device(s) registered')}
                                    </p>
                                </div>
                                <Can permission="manage devices">
                                    <Button asChild>
                                        <Link href={`/sites/${site.id}/devices?add=true`}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t('Add Device')}
                                        </Link>
                                    </Button>
                                </Can>
                            </div>
                        </div>
                    </Card>
                </FadeIn>

                <FadeIn delay={80}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <MiniStat label={t('Total')} value={totalDevices} icon={<Cpu className="h-4 w-4" />} />
                        <MiniStat label={t('Online')} value={onlineCount} icon={<Signal className="h-4 w-4 text-emerald-500" />} />
                        <MiniStat label={t('Offline')} value={offlineCount} icon={<WifiOff className="h-4 w-4 text-destructive" />} />
                        <MiniStat label={t('Low Battery')} value={lowBatteryCount} icon={<BatteryLow className="h-4 w-4 text-amber-500" />} />
                    </div>
                </FadeIn>

                <FadeIn delay={140}>
                    <Card className="shadow-elevation-1">
                        <CardContent className="p-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <form onSubmit={handleSearch} className="flex flex-1 gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input className="pl-9" placeholder={t('Search by name, DevEUI, or model...')} value={search} onChange={(e) => setSearch(e.target.value)} />
                                    </div>
                                    <Button type="submit" variant="secondary" size="sm">{t('Search')}</Button>
                                </form>
                                <div className="flex gap-2">
                                    <Select value={filters.status ?? 'all'} onValueChange={(v) => applyFilter('status', v)}>
                                        <SelectTrigger className="w-[140px]"><SelectValue placeholder={t('Status')} /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Status')}</SelectItem>
                                            <SelectItem value="active">{t('Active')}</SelectItem>
                                            <SelectItem value="offline">{t('Offline')}</SelectItem>
                                            <SelectItem value="pending">{t('Pending')}</SelectItem>
                                            <SelectItem value="provisioned">{t('Provisioned')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {zones.length > 0 && (
                                        <Select value={filters.zone ?? 'all'} onValueChange={(v) => applyFilter('zone', v)}>
                                            <SelectTrigger className="w-[140px]"><SelectValue placeholder={t('Zone')} /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Zones')}</SelectItem>
                                                {zones.map((z) => (<SelectItem key={z} value={z}>{z}</SelectItem>))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </FadeIn>

                <FadeIn delay={200}>
                    <Card className="shadow-elevation-1">
                        <DataTable
                            columns={columns}
                            data={devices.data}
                            bordered={false}
                            onRowClick={(device) => router.get(`/sites/${site.id}/devices/${device.id}`)}
                            emptyState={
                                <EmptyState
                                    size="sm"
                                    variant="muted"
                                    className="border-0"
                                    icon={<Cpu className="h-5 w-5 text-muted-foreground" />}
                                    title={t('No devices')}
                                    description={t('Add devices to this site to start monitoring')}
                                />
                            }
                        />

                        {devices.last_page > 1 && (
                            <div className="flex items-center justify-between border-t px-4 py-3">
                                <p className="text-xs text-muted-foreground">
                                    {t('Page')} <span className="font-mono tabular-nums">{devices.current_page}</span> {t('of')} <span className="font-mono tabular-nums">{devices.last_page}</span>
                                </p>
                                <div className="flex gap-1">
                                    <Button variant="outline" size="icon-sm" disabled={!devices.prev_page_url} onClick={() => devices.prev_page_url && router.get(devices.prev_page_url, {}, { preserveState: true })}><ChevronLeft className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="icon-sm" disabled={!devices.next_page_url} onClick={() => devices.next_page_url && router.get(devices.next_page_url, {}, { preserveState: true })}><ChevronRight className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        )}
                    </Card>
                </FadeIn>
            </div>
        </AppLayout>
    );
}

function MiniStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
    return (
        <Card className="shadow-elevation-1">
            <div className="flex items-center gap-3 p-3">
                {icon}
                <div>
                    <p className="font-mono text-xl font-bold tabular-nums">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                </div>
            </div>
        </Card>
    );
}

export function DevicesIndexSkeleton() {
    return (
        <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
            <Card className="shadow-elevation-1 overflow-hidden">
                <div className="border-b px-6 py-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-40" /><Skeleton className="h-4 w-36" /></div>
                        <Skeleton className="h-9 w-28" />
                    </div>
                </div>
            </Card>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="shadow-elevation-1"><div className="flex items-center gap-3 p-3"><Skeleton className="h-4 w-4 rounded" /><div className="space-y-1"><Skeleton className="h-6 w-10" /><Skeleton className="h-3 w-16" /></div></div></Card>
                ))}
            </div>
            <Card className="shadow-elevation-1"><CardContent className="p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><Skeleton className="h-9 flex-1" /><div className="flex gap-2"><Skeleton className="h-9 w-[140px]" /><Skeleton className="h-9 w-[140px]" /></div></div></CardContent></Card>
            <Card className="shadow-elevation-1">
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
                                <TableCell><div className="flex items-center gap-2"><Skeleton className="h-2 w-2 rounded-full" /><Skeleton className="h-4 w-28" /></div></TableCell>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell className="hidden md:table-cell"><Skeleton className="h-3 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                <TableCell><div className="flex items-center gap-2"><Skeleton className="h-4 w-4" /><Skeleton className="h-1.5 w-12" /><Skeleton className="h-3 w-8" /></div></TableCell>
                                <TableCell className="hidden lg:table-cell"><div className="flex items-center gap-1.5"><Skeleton className="h-3.5 w-3.5" /><Skeleton className="h-3 w-16" /></div></TableCell>
                                <TableCell><Skeleton className="h-3 w-12" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
