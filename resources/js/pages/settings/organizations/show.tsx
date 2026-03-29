import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { DataTable } from '@/components/ui/data-table';
import { DetailCard } from '@/components/ui/detail-card';
import { FadeIn } from '@/components/ui/fade-in';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Subscription } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, ArrowLeft, Download, MapPin, Mail, Pencil, Phone, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

/* -- Types ------------------------------------------------------------ */

interface SiteWithCounts {
    id: number;
    name: string;
    status: string;
    timezone: string | null;
    devices_count: number;
    gateways_count: number;
    online_devices_count: number;
    active_alerts_count: number;
    critical_alerts_count: number;
    open_work_orders_count: number;
}

interface UserSummary {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
}

interface OrganizationDetail {
    id: number;
    name: string;
    slug: string;
    segment: string | null;
    plan: string | null;
    status: string;
    logo: string | null;
    branding: Record<string, string> | null;
    default_timezone: string | null;
    default_opening_hour: string | null;
    created_at: string;
}

interface AlertFeedItem {
    id: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'active' | 'acknowledged';
    device_name: string;
    site_name: string;
    triggered_at: string;
    metric: string | null;
    value: number | null;
    threshold: number | null;
    rule_name: string | null;
}

interface PrimaryContact {
    id: number;
    name: string;
    email: string;
    phone: string | null;
}

interface OrganizationNote {
    id: number;
    note: string;
    created_at: string;
    user: { id: number; name: string };
}

interface Props {
    organization: OrganizationDetail;
    sites: SiteWithCounts[];
    users: UserSummary[];
    subscription?: Subscription | null;
    timezones: string[];
    segments: string[];
    primary_contact: PrimaryContact | null;
    last_user_activity: string | null;
    recent_alerts: AlertFeedItem[];
    notes: OrganizationNote[];
}

/* -- Constants -------------------------------------------------------- */

const statusVariants: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
    active: 'success',
    onboarding: 'warning',
    suspended: 'destructive',
    archived: 'secondary',
};

const segmentVariants: Record<string, 'info' | 'secondary' | 'outline' | 'warning' | 'success'> = {
    retail: 'info',
    cold_chain: 'secondary',
    industrial: 'warning',
    commercial: 'outline',
    foodservice: 'success',
};

const siteStatusVariants: Record<string, 'success' | 'warning' | 'outline'> = {
    active: 'success',
    onboarding: 'warning',
    draft: 'outline',
    suspended: 'warning',
};

const STATUS_COLORS: Record<string, string> = {
    active: '#10b981',
    onboarding: '#17a8ec',
    suspended: '#ee7d77',
    draft: '#484848',
    archived: '#484848',
};

const ROLE_COLORS = ['#b9c7df', '#17a8ec', '#10b981', '#ee7d77', '#ff716a', '#acabaa'];

/* -- KPI Card --------------------------------------------------------- */

const KPI_ACCENTS = {
    emerald: 'border-l-ob-emerald',
    coral: 'border-l-ob-coral',
    cyan: 'border-l-ob-cyan',
    steel: 'border-l-ob-steel',
} as const;

function KpiCard({ label, value, accent }: { label: string; value: number; accent?: keyof typeof KPI_ACCENTS }) {
    return (
        <div className={`rounded-lg bg-accent/40 px-4 py-2.5 ${accent ? `border-l-2 ${KPI_ACCENTS[accent]}` : ''}`}>
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
            <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-foreground">{String(value).padStart(2, '0')}</p>
        </div>
    );
}

/* -- Section Header --------------------------------------------------- */

function SectionHeader({ label, count }: { label: string; count?: number }) {
    return (
        <div className="flex items-center gap-2.5 pb-3">
            <span className="font-label text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
            {count !== undefined && (
                <Badge variant="secondary" className="font-mono text-[10px] tabular-nums">{count}</Badge>
            )}
            <div className="h-px flex-1 bg-border/10" />
        </div>
    );
}

/* -- Main Component --------------------------------------------------- */

export default function OrganizationShow({ organization, sites, users, primary_contact, last_user_activity, recent_alerts, notes }: Props) {
    const { t } = useLang();
    const [suspendOpen, setSuspendOpen] = useState(false);
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [reactivateOpen, setReactivateOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Settings', href: '/settings/profile' },
        { title: 'Organizations', href: '/settings/organizations' },
        { title: organization.name, href: '#' },
    ];

    const totalDevices = sites.reduce((sum, s) => sum + s.devices_count, 0);
    const totalOnline = sites.reduce((sum, s) => sum + s.online_devices_count, 0);
    const totalGateways = sites.reduce((sum, s) => sum + s.gateways_count, 0);
    const totalAlerts = sites.reduce((sum, s) => sum + s.active_alerts_count, 0);
    const totalWorkOrders = sites.reduce((sum, s) => sum + s.open_work_orders_count, 0);

    // -- Chart data --
    const siteStatusData = useMemo(() => {
        const counts: Record<string, number> = {};
        sites.forEach((s) => { counts[s.status] = (counts[s.status] ?? 0) + 1; });
        return Object.entries(counts).map(([status, count]) => ({
            name: status.charAt(0).toUpperCase() + status.slice(1),
            value: count,
            fill: STATUS_COLORS[status] ?? '#484848',
        }));
    }, [sites]);

    const devicesPerSite = useMemo(() =>
        sites.map((s) => ({
            name: s.name.length > 14 ? s.name.substring(0, 14) + '…' : s.name,
            devices: s.devices_count,
            gateways: s.gateways_count,
        })),
    [sites]);

    const roleData = useMemo(() => {
        const counts: Record<string, number> = {};
        users.forEach((u) => {
            const role = u.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            counts[role] = (counts[role] ?? 0) + 1;
        });
        return Object.entries(counts).map(([role, count], i) => ({
            name: role,
            value: count,
            fill: ROLE_COLORS[i % ROLE_COLORS.length],
        }));
    }, [users]);

    // -- Actions --
    function handleSuspend() {
        setActionLoading(true);
        router.post(`/settings/organizations/${organization.id}/suspend`, {}, {
            preserveScroll: true,
            onFinish: () => { setActionLoading(false); setSuspendOpen(false); },
        });
    }

    function handleReactivate() {
        setActionLoading(true);
        router.post(`/settings/organizations/${organization.id}/reactivate`, {}, {
            preserveScroll: true,
            onFinish: () => { setActionLoading(false); setReactivateOpen(false); },
        });
    }

    function handleArchive() {
        setActionLoading(true);
        router.delete(`/settings/organizations/${organization.id}`, {
            onFinish: () => { setActionLoading(false); setArchiveOpen(false); },
        });
    }

    // -- Activity log (lazy-loaded) --
    const [activeTab, setActiveTab] = useState('sites');
    const [activities, setActivities] = useState<Array<{ id: number; description: string; event: string; created_at: string; causer?: { id: number; name: string } }> | null>(null);
    const [activitiesLoading, setActivitiesLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'activity' && activities === null && !activitiesLoading) {
            setActivitiesLoading(true);
            fetch(`/activity-log/organization/${organization.id}`, {
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            })
                .then((res) => res.json())
                .then((data) => { setActivities(data); setActivitiesLoading(false); })
                .catch(() => { setActivities([]); setActivitiesLoading(false); });
        }
    }, [activeTab, activities, activitiesLoading, organization.id]);

    // -- Table columns --
    const siteColumns = useMemo<ColumnDef<SiteWithCounts>[]>(
        () => [
            {
                accessorKey: 'name',
                header: () => t('Site'),
                cell: ({ row }) => (
                    <div>
                        <span className="font-medium">{row.original.name}</span>
                        <p className="font-mono text-[10px] text-muted-foreground">
                            {row.original.online_devices_count}/{row.original.devices_count} {t('online')}
                        </p>
                    </div>
                ),
            },
            {
                accessorKey: 'devices_count',
                header: () => t('Devices'),
                cell: ({ row }) => {
                    const { devices_count, online_devices_count } = row.original;
                    const pct = devices_count > 0 ? Math.round((online_devices_count / devices_count) * 100) : 0;
                    return (
                        <div className="flex items-center gap-2">
                            <span className="font-mono tabular-nums">{devices_count}</span>
                            {devices_count > 0 && (
                                <span className={`font-mono text-[10px] tabular-nums ${pct === 100 ? 'text-ob-emerald' : pct > 0 ? 'text-amber-500' : 'text-destructive-foreground'}`}>
                                    {pct}%
                                </span>
                            )}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'active_alerts_count',
                header: () => t('Alerts'),
                cell: ({ row }) => {
                    const { active_alerts_count, critical_alerts_count } = row.original;
                    if (active_alerts_count === 0) {
                        return <span className="font-mono text-xs tabular-nums text-muted-foreground">0</span>;
                    }
                    return (
                        <div className="flex items-center gap-1.5">
                            <span className="font-mono tabular-nums text-destructive-foreground">{active_alerts_count}</span>
                            {critical_alerts_count > 0 && (
                                <Badge variant="destructive" className="px-1 py-0 text-[9px]">
                                    {critical_alerts_count} {t('crit')}
                                </Badge>
                            )}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'open_work_orders_count',
                header: () => t('Work Orders'),
                cell: ({ row }) => {
                    const count = row.original.open_work_orders_count;
                    return (
                        <span className={`font-mono tabular-nums ${count > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                            {count}
                        </span>
                    );
                },
            },
            {
                accessorKey: 'status',
                header: () => t('Status'),
                cell: ({ row }) => (
                    <Badge variant={siteStatusVariants[row.original.status] ?? 'outline'} className="text-xs capitalize">
                        {row.original.status}
                    </Badge>
                ),
            },
        ],
        [t],
    );

    const userColumns = useMemo<ColumnDef<UserSummary>[]>(
        () => [
            {
                accessorKey: 'name',
                header: () => t('Name'),
                cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
            },
            {
                accessorKey: 'email',
                header: () => t('Email'),
                cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.email}</span>,
            },
            {
                accessorKey: 'role',
                header: () => t('Role'),
                cell: ({ row }) => (
                    <Badge variant="outline" className="text-xs capitalize">{row.original.role.replace(/_/g, ' ')}</Badge>
                ),
            },
            {
                accessorKey: 'status',
                header: () => t('Status'),
                cell: ({ row }) => (
                    <Badge variant={row.original.status === 'active' ? 'success' : 'secondary'} className="text-xs capitalize">
                        {row.original.status}
                    </Badge>
                ),
            },
        ],
        [t],
    );

    const sitesEmpty = (
        <div className="flex flex-col items-center gap-2 py-10">
            <MapPin className="h-6 w-6 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{t('No sites configured')}</p>
        </div>
    );
    const usersEmpty = (
        <div className="flex flex-col items-center gap-2 py-10">
            <Users className="h-6 w-6 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{t('No users')}</p>
        </div>
    );

    // -- Branding swatches --
    const brandingColors = [
        organization.branding?.primary_color,
        organization.branding?.secondary_color,
        organization.branding?.accent_color,
    ].filter(Boolean) as string[];

    const chartTooltipStyle = {
        borderRadius: 8,
        fontSize: 12,
        border: 'none',
        backgroundColor: 'rgba(31, 32, 32, 0.95)',
        color: '#e7e5e4',
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${organization.name} — ${t('Organizations')}`} />
            <div className="obsidian flex h-full flex-1 flex-col bg-background">

                {/* ━━ HEADER BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn direction="down" duration={300}>
                    <div className="bg-card px-5 py-4 md:px-8">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.get('/settings/organizations')}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div className="mr-auto">
                                <h1 className="font-display text-lg font-bold tracking-tight text-foreground">{organization.name}</h1>
                                <p className="font-mono text-[11px] text-muted-foreground">{organization.slug}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant={statusVariants[organization.status] ?? 'outline'} className="capitalize">{organization.status}</Badge>
                                {organization.segment && <Badge variant={segmentVariants[organization.segment] ?? 'outline'} className="capitalize">{organization.segment.replace('_', ' ')}</Badge>}
                                {organization.plan && <Badge variant="secondary" className="capitalize">{organization.plan}</Badge>}
                            </div>
                            <div className="flex items-center gap-2">
                                {['active', 'onboarding'].includes(organization.status) && (
                                    <Button variant="outline" size="sm" className="border-border/10 text-amber-500 hover:text-amber-400" onClick={() => setSuspendOpen(true)}>{t('Suspend')}</Button>
                                )}
                                {organization.status === 'suspended' && (
                                    <Button variant="outline" size="sm" className="border-border/10 text-ob-emerald" onClick={() => setReactivateOpen(true)}>{t('Reactivate')}</Button>
                                )}
                                {organization.status !== 'archived' && (
                                    <Button variant="outline" size="sm" className="border-border/10 text-destructive-foreground" onClick={() => setArchiveOpen(true)}>{t('Archive')}</Button>
                                )}
                                <Button variant="outline" size="sm" className="border-border/10" onClick={() => router.post(`/settings/organizations/${organization.id}/export`)}>
                                    <Download className="mr-1.5 h-3.5 w-3.5" />{t('Export')}
                                </Button>
                                <Button size="sm" onClick={() => router.get(`/settings/organization`)}>
                                    <Pencil className="mr-1.5 h-3.5 w-3.5" />{t('Edit')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* ━━ KPI STRIP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={50} duration={300}>
                    <div className="grid grid-cols-2 gap-3 px-5 pt-5 md:grid-cols-5 md:px-8">
                        <KpiCard label={t('Sites')} value={sites.length} accent="cyan" />
                        <KpiCard label={t('Devices')} value={totalDevices} accent="steel" />
                        <KpiCard label={t('Alerts')} value={totalAlerts} accent={totalAlerts > 0 ? 'coral' : undefined} />
                        <KpiCard label={t('Work Orders')} value={totalWorkOrders} accent={totalWorkOrders > 0 ? 'coral' : undefined} />
                        <KpiCard label={t('Users')} value={users.length} accent="emerald" />
                    </div>
                </FadeIn>

                {/* ━━ MAIN CONTENT: Charts + Tabs | Details sidebar ━━━━━━━━━ */}
                <div className="flex-1 px-5 pt-5 pb-6 md:px-8">
                    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">

                        {/* ── LEFT COLUMN: Charts → Tabs ─────────────────────── */}
                        <div className="space-y-5">
                            {/* Charts: combined breakdown + devices per site */}
                            <FadeIn delay={100} duration={400}>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {/* Sites by Status + User Roles (combined card) */}
                                    <Card className="border-border/10 shadow-none">
                                        <CardContent className="p-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                {/* Sites by Status */}
                                                <div>
                                                    <p className="mb-2 font-label text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                                        {t('Sites by Status')}
                                                    </p>
                                                    {siteStatusData.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height={130}>
                                                            <BarChart data={siteStatusData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(72,72,72,0.15)" />
                                                                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#767575' }} axisLine={false} tickLine={false} />
                                                                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 10, fill: '#acabaa' }} axisLine={false} tickLine={false} />
                                                                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(72,72,72,0.1)' }} />
                                                                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
                                                                    {siteStatusData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                                                                </Bar>
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    ) : (
                                                        <p className="py-6 text-center text-[10px] text-muted-foreground">{t('No data')}</p>
                                                    )}
                                                </div>
                                                {/* User Roles */}
                                                <div>
                                                    <p className="mb-2 font-label text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                                        {t('User Roles')}
                                                    </p>
                                                    {roleData.length > 0 ? (
                                                        <ResponsiveContainer width="100%" height={130}>
                                                            <BarChart data={roleData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(72,72,72,0.15)" />
                                                                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#767575' }} axisLine={false} tickLine={false} />
                                                                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9, fill: '#acabaa' }} axisLine={false} tickLine={false} />
                                                                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(72,72,72,0.1)' }} />
                                                                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16}>
                                                                    {roleData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                                                                </Bar>
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    ) : (
                                                        <p className="py-6 text-center text-[10px] text-muted-foreground">{t('No data')}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Devices per Site */}
                                    <Card className="border-border/10 shadow-none">
                                        <CardContent className="p-4">
                                            <p className="mb-2 font-label text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                                {t('Devices per Site')}
                                            </p>
                                            {devicesPerSite.length > 0 ? (
                                                <ResponsiveContainer width="100%" height={130}>
                                                    <BarChart data={devicesPerSite} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(72,72,72,0.15)" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#767575' }} axisLine={false} tickLine={false} />
                                                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#767575' }} axisLine={false} tickLine={false} />
                                                        <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(72,72,72,0.1)' }} />
                                                        <Bar dataKey="devices" fill="#17a8ec" radius={[4, 4, 0, 0]} maxBarSize={28} name={t('Devices')} />
                                                        <Bar dataKey="gateways" fill="#b9c7df" radius={[4, 4, 0, 0]} maxBarSize={28} name={t('Gateways')} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <p className="py-6 text-center text-[10px] text-muted-foreground">{t('No data')}</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </FadeIn>

                            {/* Tabbed tables */}
                            <FadeIn delay={150} duration={400}>
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-0">
                                    <TabsList className="h-auto w-fit gap-0 rounded-none border-b border-border/10 bg-transparent p-0">
                                        <TabsTrigger
                                            value="sites"
                                            className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground data-[state=active]:border-ob-cyan data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                                        >
                                            {t('Sites')}
                                            <Badge variant="secondary" className="ml-2 font-mono text-[10px] tabular-nums">{sites.length}</Badge>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="users"
                                            className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground data-[state=active]:border-ob-cyan data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                                        >
                                            {t('Users')}
                                            <Badge variant="secondary" className="ml-2 font-mono text-[10px] tabular-nums">{users.length}</Badge>
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="alerts"
                                            className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground data-[state=active]:border-ob-cyan data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                                        >
                                            {t('Alerts')}
                                            {recent_alerts.length > 0 && (
                                                <Badge variant="destructive" className="ml-2 font-mono text-[10px] tabular-nums">{recent_alerts.length}</Badge>
                                            )}
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="activity"
                                            className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground data-[state=active]:border-ob-cyan data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                                        >
                                            {t('Activity')}
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="notes"
                                            className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2.5 font-label text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground data-[state=active]:border-ob-cyan data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                                        >
                                            {t('Notes')}
                                            {notes.length > 0 && (
                                                <Badge variant="secondary" className="ml-2 font-mono text-[10px] tabular-nums">{notes.length}</Badge>
                                            )}
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="sites" className="mt-4">
                                        <Card className="border-border/10 shadow-none">
                                            <DataTable
                                                columns={siteColumns}
                                                data={sites}
                                                getRowId={(r) => String(r.id)}
                                                onRowClick={(s) => router.get(`/sites/${s.id}`)}
                                                bordered={false}
                                                emptyState={sitesEmpty}
                                            />
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="users" className="mt-4">
                                        <Card className="border-border/10 shadow-none">
                                            <DataTable
                                                columns={userColumns}
                                                data={users}
                                                getRowId={(r) => String(r.id)}
                                                bordered={false}
                                                emptyState={usersEmpty}
                                            />
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="alerts" className="mt-4">
                                        <Card className="border-border/10 shadow-none">
                                            {recent_alerts.length > 0 ? (
                                                <div className="divide-y divide-border/5">
                                                    {recent_alerts.map((alert) => {
                                                        const severityColors: Record<string, string> = {
                                                            critical: 'bg-red-500',
                                                            high: 'bg-orange-500',
                                                            medium: 'bg-amber-500',
                                                            low: 'bg-ob-steel',
                                                        };
                                                        return (
                                                            <div
                                                                key={alert.id}
                                                                className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-accent/30 cursor-pointer"
                                                                onClick={() => router.get(`/alerts/${alert.id}`)}
                                                            >
                                                                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${severityColors[alert.severity] ?? 'bg-muted-foreground'}`} />
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-sm font-medium text-foreground truncate">
                                                                            {alert.rule_name ?? alert.metric ?? t('Alert')}
                                                                        </p>
                                                                        <Badge variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'high' ? 'warning' : 'outline'} className="shrink-0 text-[9px] capitalize">
                                                                            {alert.severity}
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground truncate">
                                                                        {alert.device_name} @ {alert.site_name}
                                                                        {alert.value != null && alert.threshold != null && (
                                                                            <> — {alert.metric}: {alert.value} (threshold: {alert.threshold})</>
                                                                        )}
                                                                    </p>
                                                                </div>
                                                                <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                                                                    {formatTimeAgo(alert.triggered_at)}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 py-10">
                                                    <AlertTriangle className="h-6 w-6 text-muted-foreground/30" />
                                                    <p className="text-sm text-muted-foreground">{t('No active alerts')}</p>
                                                </div>
                                            )}
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="activity" className="mt-4">
                                        <Card className="border-border/10 shadow-none">
                                            {activitiesLoading ? (
                                                <div className="space-y-3 p-4">
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                        <div key={i} className="flex items-center gap-3">
                                                            <Skeleton className="h-8 w-8 rounded-full" />
                                                            <div className="flex-1 space-y-1.5">
                                                                <Skeleton className="h-3 w-32" />
                                                                <Skeleton className="h-3 w-48" />
                                                            </div>
                                                            <Skeleton className="h-3 w-16" />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : activities && activities.length > 0 ? (
                                                <div className="divide-y divide-border/5">
                                                    {activities.map((activity) => {
                                                        const eventColors: Record<string, string> = {
                                                            created: 'bg-ob-emerald',
                                                            updated: 'bg-amber-500',
                                                            deleted: 'bg-ob-coral',
                                                            login: 'bg-ob-cyan',
                                                            logout: 'bg-ob-dim',
                                                        };
                                                        return (
                                                            <div key={activity.id} className="flex items-start gap-3 px-5 py-4">
                                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card">
                                                                    <span className="font-label text-[10px] font-bold text-muted-foreground">
                                                                        {activity.causer?.name?.charAt(0)?.toUpperCase() ?? '?'}
                                                                    </span>
                                                                </div>
                                                                <div className="min-w-0 flex-1 pt-0.5">
                                                                    <p className="text-sm text-foreground">
                                                                        <span className="font-medium">{activity.causer?.name ?? t('System')}</span>
                                                                        {' '}
                                                                        <span className="text-muted-foreground">{activity.description}</span>
                                                                    </p>
                                                                </div>
                                                                <div className="flex shrink-0 items-center gap-2 pt-1">
                                                                    <span className={`h-1.5 w-1.5 rounded-full ${eventColors[activity.event] ?? 'bg-ob-dim'}`} />
                                                                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                                                                        {formatTimeAgo(activity.created_at)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 py-10">
                                                    <Users className="h-6 w-6 text-muted-foreground/30" />
                                                    <p className="text-sm text-muted-foreground">{t('No activity recorded')}</p>
                                                </div>
                                            )}
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="notes" className="mt-4">
                                        <NotesTab organizationId={organization.id} notes={notes} />
                                    </TabsContent>
                                </Tabs>
                            </FadeIn>
                        </div>

                        {/* ── RIGHT COLUMN: Details (spans full height) ──────── */}
                        <FadeIn delay={100} duration={400}>
                            <div className="lg:sticky lg:top-4">
                                <SectionHeader label={t('Organization Details')} />
                                <DetailCard
                                    className="border-border/10 shadow-none"
                                    items={[
                                        { label: t('Slug'), value: <code className="font-mono text-xs text-foreground/70">{organization.slug}</code> },
                                        {
                                            label: t('Segment'),
                                            value: organization.segment
                                                ? <Badge variant={segmentVariants[organization.segment] ?? 'outline'} className="text-xs capitalize">{organization.segment.replace('_', ' ')}</Badge>
                                                : '--',
                                        },
                                        {
                                            label: t('Plan'),
                                            value: organization.plan
                                                ? <Badge variant="secondary" className="text-xs capitalize">{organization.plan}</Badge>
                                                : '--',
                                        },
                                        { label: t('Timezone'), value: <span className="font-mono text-xs">{organization.default_timezone ?? '--'}</span> },
                                        { label: t('Opening Hour'), value: <span className="font-mono tabular-nums">{organization.default_opening_hour ?? '--'}</span> },
                                        { label: t('Created'), value: <span className="font-mono text-xs tabular-nums">{formatTimeAgo(organization.created_at)}</span> },
                                        { label: t('Last Active'), value: <span className="font-mono text-xs tabular-nums">{last_user_activity ? formatTimeAgo(last_user_activity) : '--'}</span> },
                                        ...(brandingColors.length > 0
                                            ? [{
                                                label: t('Branding'),
                                                value: (
                                                    <div className="flex gap-1.5">
                                                        {brandingColors.map((c) => (
                                                            <span key={c} className="h-5 w-5 rounded-full border border-border/20" style={{ backgroundColor: c }} title={c} />
                                                        ))}
                                                    </div>
                                                ),
                                            }]
                                            : []),
                                        ...(organization.logo
                                            ? [{ label: t('Logo'), value: <img src={organization.logo} alt="" className="h-6 rounded object-contain" /> }]
                                            : []),
                                    ]}
                                />

                                {/* Primary Contact */}
                                {primary_contact && (
                                    <div className="mt-5">
                                        <SectionHeader label={t('Primary Contact')} />
                                        <Card className="border-border/10 shadow-none">
                                            <div className="flex items-center gap-3 p-4">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card">
                                                    <span className="font-label text-xs font-bold text-muted-foreground">
                                                        {primary_contact.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-foreground">{primary_contact.name}</p>
                                                    <a href={`mailto:${primary_contact.email}`} className="block truncate font-mono text-[11px] text-muted-foreground hover:text-foreground">
                                                        {primary_contact.email}
                                                    </a>
                                                    {primary_contact.phone && (
                                                        <span className="block font-mono text-[11px] text-muted-foreground">{primary_contact.phone}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                )}
                            </div>
                        </FadeIn>
                    </div>
                </div>
            </div>

            {/* ━━ CONFIRMATION DIALOGS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <ConfirmationDialog open={suspendOpen} onOpenChange={setSuspendOpen} title={t('Suspend Organization')} description={`${t('Are you sure you want to suspend')} "${organization.name}"?`} warningMessage={t('Monitoring will continue but users will see a suspension warning. The organization can be reactivated later.')} loading={actionLoading} onConfirm={handleSuspend} actionLabel={t('Suspend')} />
            <ConfirmationDialog open={reactivateOpen} onOpenChange={setReactivateOpen} title={t('Reactivate Organization')} description={`${t('Are you sure you want to reactivate')} "${organization.name}"?`} warningMessage={t('The organization will return to active status and all users will regain full access.')} loading={actionLoading} onConfirm={handleReactivate} actionLabel={t('Reactivate')} />
            <ConfirmationDialog open={archiveOpen} onOpenChange={setArchiveOpen} title={t('Archive Organization')} description={`${t('Are you sure you want to archive')} "${organization.name}"?`} warningMessage={t('This is a permanent action. Data will be retained for 12 months then deleted. The organization cannot be reactivated.')} loading={actionLoading} onConfirm={handleArchive} actionLabel={t('Archive')} />
        </AppLayout>
    );
}

/* -- Notes Tab Component ---------------------------------------------- */

function NotesTab({ organizationId, notes }: { organizationId: number; notes: OrganizationNote[] }) {
    const { t } = useLang();
    const form = useForm({ note: '' });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(`/settings/organizations/${organizationId}/notes`, {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    }

    return (
        <Card className="border-border/10 shadow-none">
            {/* Compose */}
            <div className="p-5">
                <form onSubmit={handleSubmit} className="space-y-3">
                    <textarea
                        value={form.data.note}
                        onChange={(e) => form.setData('note', e.target.value)}
                        placeholder={t('Add an internal note...')}
                        rows={2}
                        className="w-full resize-none rounded-lg border-0 bg-accent/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring/30"
                    />
                    <div className="flex justify-end">
                        <Button size="sm" type="submit" disabled={form.processing || !form.data.note.trim()}>
                            {form.processing ? t('Saving...') : t('Add Note')}
                        </Button>
                    </div>
                </form>
            </div>

            {/* Notes list */}
            {notes.length > 0 ? (
                <div className="divide-y divide-border/5">
                    {notes.map((note) => (
                        <div key={note.id} className="group px-5 py-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card">
                                    <span className="font-label text-[9px] font-bold text-muted-foreground">
                                        {note.user.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <span className="text-xs font-medium text-foreground">{note.user.name}</span>
                                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{formatTimeAgo(note.created_at)}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-auto h-5 px-1.5 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-destructive-foreground group-hover:opacity-100"
                                    onClick={() => router.delete(`/settings/organizations/${organizationId}/notes/${note.id}`, { preserveScroll: true })}
                                >
                                    {t('Delete')}
                                </Button>
                            </div>
                            <p className="mt-2 pl-8 text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{note.note}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2 px-5 pb-8 pt-4">
                    <p className="text-xs text-muted-foreground">{t('No notes yet. Add one above.')}</p>
                </div>
            )}
        </Card>
    );
}
