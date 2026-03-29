import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { DataTable } from '@/components/ui/data-table';
import { FadeIn } from '@/components/ui/fade-in';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Subscription } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { Head, router, useForm } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, ArrowLeft, Archive, Download, MapPin, Pencil, ShieldAlert, Users } from 'lucide-react';
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
    active: 'success', onboarding: 'warning', suspended: 'destructive', archived: 'secondary',
};

const segmentVariants: Record<string, 'info' | 'secondary' | 'outline' | 'warning' | 'success'> = {
    retail: 'info', cold_chain: 'secondary', industrial: 'warning', commercial: 'outline', foodservice: 'success',
};

const siteStatusVariants: Record<string, 'success' | 'warning' | 'outline'> = {
    active: 'success', onboarding: 'warning', draft: 'outline', suspended: 'warning',
};

const STATUS_COLORS: Record<string, string> = {
    active: '#10b981', onboarding: '#17a8ec', suspended: '#ee7d77', draft: '#484848', archived: '#484848',
};

const ROLE_COLORS = ['#b9c7df', '#17a8ec', '#10b981', '#ee7d77', '#ff716a', '#acabaa'];


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
            name: role, value: count, fill: ROLE_COLORS[i % ROLE_COLORS.length],
        }));
    }, [users]);

    // -- Actions --
    function handleSuspend() {
        setActionLoading(true);
        router.post(`/settings/organizations/${organization.id}/suspend`, {}, { preserveScroll: true, onFinish: () => { setActionLoading(false); setSuspendOpen(false); } });
    }
    function handleReactivate() {
        setActionLoading(true);
        router.post(`/settings/organizations/${organization.id}/reactivate`, {}, { preserveScroll: true, onFinish: () => { setActionLoading(false); setReactivateOpen(false); } });
    }
    function handleArchive() {
        setActionLoading(true);
        router.delete(`/settings/organizations/${organization.id}`, { onFinish: () => { setActionLoading(false); setArchiveOpen(false); } });
    }

    // -- Activity log --
    const [activeTab, setActiveTab] = useState('sites');
    const [activities, setActivities] = useState<Array<{ id: number; description: string; event: string; created_at: string; causer?: { id: number; name: string } }> | null>(null);
    const [activitiesLoading, setActivitiesLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'activity' && activities === null && !activitiesLoading) {
            setActivitiesLoading(true);
            fetch(`/activity-log/organization/${organization.id}`, { headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
                .then((res) => res.json())
                .then((data) => { setActivities(data); setActivitiesLoading(false); })
                .catch(() => { setActivities([]); setActivitiesLoading(false); });
        }
    }, [activeTab, activities, activitiesLoading, organization.id]);

    // -- Table columns --
    const siteColumns = useMemo<ColumnDef<SiteWithCounts>[]>(() => [
        { accessorKey: 'name', header: () => t('Site'), cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
        { accessorKey: 'devices_count', header: () => t('Devices'), cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.devices_count}</span> },
        {
            id: 'online',
            header: () => t('Online'),
            cell: ({ row }) => {
                const { devices_count, online_devices_count } = row.original;
                const pct = devices_count > 0 ? Math.round((online_devices_count / devices_count) * 100) : 0;
                return <span className={`font-mono text-xs font-semibold tabular-nums ${pct >= 90 ? 'text-ob-emerald' : pct > 50 ? 'text-amber-500' : 'text-destructive-foreground'}`}>{pct}%</span>;
            },
        },
        {
            accessorKey: 'active_alerts_count', header: () => t('Alerts'),
            cell: ({ row }) => {
                const c = row.original.active_alerts_count;
                return <span className={`font-mono tabular-nums ${c > 0 ? 'text-destructive-foreground' : 'text-muted-foreground'}`}>{c}</span>;
            },
        },
        {
            accessorKey: 'open_work_orders_count', header: () => t('Work Orders'),
            cell: ({ row }) => {
                const c = row.original.open_work_orders_count;
                return <span className={`font-mono tabular-nums ${c > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>{c}</span>;
            },
        },
        {
            accessorKey: 'status', header: () => t('Status'),
            cell: ({ row }) => <Badge variant={siteStatusVariants[row.original.status] ?? 'outline'} className="text-xs capitalize">{row.original.status}</Badge>,
        },
    ], [t]);

    const userColumns = useMemo<ColumnDef<UserSummary>[]>(() => [
        { accessorKey: 'name', header: () => t('Name'), cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
        { accessorKey: 'email', header: () => t('Email'), cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.email}</span> },
        { accessorKey: 'role', header: () => t('Role'), cell: ({ row }) => <Badge variant="outline" className="text-xs capitalize">{row.original.role.replace(/_/g, ' ')}</Badge> },
        { accessorKey: 'status', header: () => t('Status'), cell: ({ row }) => <Badge variant={row.original.status === 'active' ? 'success' : 'secondary'} className="text-xs capitalize">{row.original.status}</Badge> },
    ], [t]);

    const sitesEmpty = (<div className="flex flex-col items-center gap-2 py-10"><MapPin className="h-6 w-6 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">{t('No sites configured')}</p></div>);
    const usersEmpty = (<div className="flex flex-col items-center gap-2 py-10"><Users className="h-6 w-6 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">{t('No users')}</p></div>);

    const brandingColors = [organization.branding?.primary_color, organization.branding?.secondary_color, organization.branding?.accent_color].filter(Boolean) as string[];

    const chartTooltipStyle = { borderRadius: 8, fontSize: 12, border: 'none', backgroundColor: 'rgba(31, 32, 32, 0.95)', color: '#e7e5e4' };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${organization.name} — ${t('Organizations')}`} />
            <div className="obsidian flex h-full flex-1 overflow-hidden bg-background">

                {/* ━━ SCROLLABLE LEFT CONTENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div className="flex-1 overflow-y-auto">

                    {/* Mobile-only header (hidden on lg) */}
                    <div className="border-b border-border/5 bg-card px-5 py-4 lg:hidden">
                        <div className="flex flex-wrap items-center gap-3">
                            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.get('/settings/organizations')}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div className="mr-auto">
                                <h1 className="font-display text-lg font-bold tracking-tight text-foreground">{organization.name}</h1>
                                <p className="font-mono text-[11px] text-muted-foreground">{organization.slug}</p>
                            </div>
                            <Badge variant={statusVariants[organization.status] ?? 'outline'} className="capitalize">{organization.status}</Badge>
                        </div>
                    </div>

                    {/* KPI Strip */}
                    <FadeIn direction="down" duration={300}>
                        <div className="grid grid-cols-2 gap-px overflow-hidden border-b border-border/5 bg-border/5 md:grid-cols-5">
                            <KpiCell label={t('Sites')} value={sites.length} />
                            <KpiCell label={t('Devices')} value={totalDevices} />
                            <KpiCell label={t('Alerts')} value={totalAlerts} accentColor={totalAlerts > 0 ? 'text-ob-coral' : undefined} />
                            <KpiCell label={t('Work Orders')} value={totalWorkOrders} accentColor={totalWorkOrders > 0 ? 'text-amber-500' : undefined} />
                            <KpiCell label={t('Users')} value={users.length} />
                        </div>
                    </FadeIn>

                    {/* Charts */}
                    <div className="p-4 md:p-5">
                        <FadeIn delay={75} duration={400}>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <Card className="border-border/10 shadow-none">
                                    <CardContent className="p-4">
                                        <p className="mb-2 font-label text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('Sites by Status')}</p>
                                        {siteStatusData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={100}>
                                                <BarChart data={siteStatusData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(72,72,72,0.15)" />
                                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#767575' }} axisLine={false} tickLine={false} />
                                                    <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 10, fill: '#acabaa' }} axisLine={false} tickLine={false} />
                                                    <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(72,72,72,0.1)' }} />
                                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>{siteStatusData.map((e) => <Cell key={e.name} fill={e.fill} />)}</Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : <p className="py-6 text-center text-[10px] text-muted-foreground">{t('No data')}</p>}
                                        <p className="mb-2 mt-4 font-label text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('User Roles')}</p>
                                        {roleData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={100}>
                                                <BarChart data={roleData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(72,72,72,0.15)" />
                                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#767575' }} axisLine={false} tickLine={false} />
                                                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9, fill: '#acabaa' }} axisLine={false} tickLine={false} />
                                                    <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(72,72,72,0.1)' }} />
                                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16}>{roleData.map((e) => <Cell key={e.name} fill={e.fill} />)}</Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : <p className="py-6 text-center text-[10px] text-muted-foreground">{t('No data')}</p>}
                                    </CardContent>
                                </Card>
                                <Card className="border-border/10 shadow-none">
                                    <CardContent className="p-4">
                                        <p className="mb-2 font-label text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('Devices per Site')}</p>
                                        {devicesPerSite.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={220}>
                                                <BarChart data={devicesPerSite} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(72,72,72,0.15)" />
                                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#767575' }} axisLine={false} tickLine={false} />
                                                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#767575' }} axisLine={false} tickLine={false} />
                                                    <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(72,72,72,0.1)' }} />
                                                    <Bar dataKey="devices" fill="#17a8ec" radius={[4, 4, 0, 0]} maxBarSize={28} name={t('Devices')} />
                                                    <Bar dataKey="gateways" fill="#b9c7df" radius={[4, 4, 0, 0]} maxBarSize={28} name={t('Gateways')} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : <p className="py-6 text-center text-[10px] text-muted-foreground">{t('No data')}</p>}
                                    </CardContent>
                                </Card>
                            </div>
                        </FadeIn>

                        {/* Custom Tabs */}
                        <FadeIn delay={150} duration={400}>
                            <div className="mt-5">
                                {/* Tab buttons */}
                                <div className="flex items-center gap-1 border-b border-border/10">
                                    {[
                                        { key: 'sites', label: t('Sites'), count: sites.length },
                                        { key: 'users', label: t('Users'), count: users.length },
                                        { key: 'alerts', label: t('Alerts'), count: recent_alerts.length, isAlert: true },
                                        { key: 'activity', label: t('Activity') },
                                        { key: 'notes', label: t('Notes'), count: notes.length },
                                    ].map((tab) => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] transition-colors ${
                                                activeTab === tab.key
                                                    ? 'border-foreground text-foreground'
                                                    : 'border-transparent text-muted-foreground hover:text-foreground/70'
                                            }`}
                                        >
                                            {tab.label}
                                            {tab.count !== undefined && tab.count > 0 && (
                                                <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${
                                                    tab.isAlert && tab.count > 0
                                                        ? 'bg-destructive/20 text-destructive-foreground'
                                                        : activeTab === tab.key
                                                            ? 'bg-accent text-foreground'
                                                            : 'bg-accent/50 text-muted-foreground'
                                                }`}>
                                                    {tab.count}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab content */}
                                <div className="mt-4">
                                    {activeTab === 'sites' && (
                                        <Card className="border-border/10 shadow-none">
                                            <DataTable columns={siteColumns} data={sites} getRowId={(r) => String(r.id)} onRowClick={(s) => router.get(`/sites/${s.id}`)} bordered={false} emptyState={sitesEmpty} />
                                        </Card>
                                    )}
                                    {activeTab === 'users' && (
                                        <Card className="border-border/10 shadow-none">
                                            <DataTable columns={userColumns} data={users} getRowId={(r) => String(r.id)} bordered={false} emptyState={usersEmpty} />
                                        </Card>
                                    )}
                                    {activeTab === 'alerts' && (
                                        <Card className="border-border/10 shadow-none">
                                            {recent_alerts.length > 0 ? (
                                                <div className="divide-y divide-border/5">
                                                    {recent_alerts.map((alert) => {
                                                        const sevColors: Record<string, string> = { critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-amber-500', low: 'bg-ob-steel' };
                                                        return (
                                                            <div key={alert.id} className="flex cursor-pointer items-start gap-3 px-5 py-4 transition-colors hover:bg-accent/30" onClick={() => router.get(`/alerts/${alert.id}`)}>
                                                                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${sevColors[alert.severity] ?? 'bg-muted-foreground'}`} />
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="truncate text-sm font-medium text-foreground">{alert.rule_name ?? alert.metric ?? t('Alert')}</p>
                                                                        <Badge variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'high' ? 'warning' : 'outline'} className="shrink-0 text-[9px] capitalize">{alert.severity}</Badge>
                                                                    </div>
                                                                    <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{alert.device_name} @ {alert.site_name}{alert.value != null && alert.threshold != null && <> — {alert.metric}: {alert.value} (threshold: {alert.threshold})</>}</p>
                                                                </div>
                                                                <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">{formatTimeAgo(alert.triggered_at)}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 py-10"><AlertTriangle className="h-6 w-6 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">{t('No active alerts')}</p></div>
                                            )}
                                        </Card>
                                    )}
                                    {activeTab === 'activity' && (
                                        <Card className="border-border/10 shadow-none">
                                            {activitiesLoading ? (
                                                <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-48" /></div><Skeleton className="h-3 w-16" /></div>))}</div>
                                            ) : activities && activities.length > 0 ? (
                                                <div className="divide-y divide-border/5">
                                                    {activities.map((a) => {
                                                        const evColors: Record<string, string> = { created: 'bg-ob-emerald', updated: 'bg-amber-500', deleted: 'bg-ob-coral', login: 'bg-ob-cyan', logout: 'bg-ob-dim' };
                                                        return (
                                                            <div key={a.id} className="flex items-start gap-3 px-5 py-4">
                                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card"><span className="font-label text-[10px] font-bold text-muted-foreground">{a.causer?.name?.charAt(0)?.toUpperCase() ?? '?'}</span></div>
                                                                <div className="min-w-0 flex-1 pt-0.5"><p className="text-sm text-foreground"><span className="font-medium">{a.causer?.name ?? t('System')}</span> <span className="text-muted-foreground">{a.description}</span></p></div>
                                                                <div className="flex shrink-0 items-center gap-2 pt-1"><span className={`h-1.5 w-1.5 rounded-full ${evColors[a.event] ?? 'bg-ob-dim'}`} /><span className="font-mono text-[10px] tabular-nums text-muted-foreground">{formatTimeAgo(a.created_at)}</span></div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 py-10"><Users className="h-6 w-6 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">{t('No activity recorded')}</p></div>
                                            )}
                                        </Card>
                                    )}
                                    {activeTab === 'notes' && <NotesTab organizationId={organization.id} notes={notes} />}
                                </div>
                            </div>
                        </FadeIn>
                    </div>
                </div>

                {/* ━━ RIGHT SIDEBAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <div className="hidden w-[240px] shrink-0 flex-col overflow-y-auto border-l border-border/5 bg-card lg:flex">
                    <div className="flex-1 p-5">
                        {/* Back link */}
                        <button
                            onClick={() => router.get('/settings/organizations')}
                            className="mb-4 flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <ArrowLeft className="h-3 w-3" />
                            {t('Organizations')}
                        </button>

                        {/* Org name */}
                        <h1 className="font-display text-xl font-extrabold tracking-tight text-foreground">
                            {organization.name}
                        </h1>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground/50">{organization.slug}</p>

                        {/* Badges */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            <Badge variant={statusVariants[organization.status] ?? 'outline'} className="text-[10px] capitalize">{organization.status}</Badge>
                            {organization.segment && <Badge variant={segmentVariants[organization.segment] ?? 'outline'} className="text-[10px] capitalize">{organization.segment.replace('_', ' ')}</Badge>}
                            {organization.plan && <Badge variant="secondary" className="text-[10px] capitalize">{organization.plan}</Badge>}
                        </div>

                        {/* Organization Details */}
                        <div className="mt-6">
                            <p className="mb-2 font-label text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
                                {t('Organization Details')}
                            </p>
                            <div className="space-y-2.5 text-[12px]">
                                <DetailRow label={t('Slug')} value={<code className="font-mono text-[11px] text-foreground/70">{organization.slug}</code>} />
                                <DetailRow label={t('Segment')} value={<span className="capitalize">{organization.segment?.replace('_', ' ') ?? '--'}</span>} />
                                <DetailRow label={t('Plan')} value={<span className="capitalize">{organization.plan ?? '--'}</span>} />
                                <DetailRow label={t('Timezone')} value={<span className="font-mono text-[11px]">{organization.default_timezone ?? '--'}</span>} />
                                <DetailRow label={t('Opening')} value={<span className="font-mono text-[11px] font-semibold">{organization.default_opening_hour ?? '--'}</span>} />
                                <DetailRow label={t('Created')} value={<span className="font-mono text-[11px]">{formatTimeAgo(organization.created_at)}</span>} />
                                <DetailRow label={t('Last Active')} value={<span className="font-mono text-[11px] text-ob-emerald">{last_user_activity ? formatTimeAgo(last_user_activity) : '--'}</span>} />
                            </div>
                        </div>

                        {/* Branding */}
                        {brandingColors.length > 0 && (
                            <div className="mt-5">
                                <p className="mb-2 font-label text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
                                    {t('Branding')}
                                </p>
                                <div className="flex gap-2">
                                    {brandingColors.map((c) => (
                                        <span key={c} className="h-6 w-6 rounded-full border border-border/20" style={{ backgroundColor: c }} title={c} />
                                    ))}
                                </div>
                                <p className="mt-1 font-mono text-[9px] text-muted-foreground/40">Primary, Background, Accent</p>
                            </div>
                        )}

                        {/* Primary Contact */}
                        {primary_contact && (
                            <div className="mt-5">
                                <p className="mb-2 font-label text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
                                    {t('Primary Contact')}
                                </p>
                                <p className="text-[13px] font-semibold text-foreground">{primary_contact.name}</p>
                                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{primary_contact.email}</p>
                                {primary_contact.phone && <p className="font-mono text-[11px] text-muted-foreground">{primary_contact.phone}</p>}
                            </div>
                        )}
                    </div>

                    {/* Action buttons pinned to bottom */}
                    <div className="border-t border-border/5 p-4">
                        <Button size="sm" className="w-full" onClick={() => router.get('/settings/organization')}>
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />{t('Edit Organization')}
                        </Button>
                        <div className="mt-2 flex gap-2">
                            {['active', 'onboarding'].includes(organization.status) && (
                                <Button variant="ghost" size="sm" className="flex-1 text-[11px] text-amber-500 hover:text-amber-400" onClick={() => setSuspendOpen(true)}>
                                    <ShieldAlert className="mr-1 h-3 w-3" />{t('Suspend')}
                                </Button>
                            )}
                            {organization.status === 'suspended' && (
                                <Button variant="ghost" size="sm" className="flex-1 text-[11px] text-ob-emerald" onClick={() => setReactivateOpen(true)}>{t('Reactivate')}</Button>
                            )}
                            {organization.status !== 'archived' && (
                                <Button variant="ghost" size="sm" className="flex-1 text-[11px] text-destructive-foreground" onClick={() => setArchiveOpen(true)}>
                                    <Archive className="mr-1 h-3 w-3" />{t('Archive')}
                                </Button>
                            )}
                            <Button variant="ghost" size="sm" className="flex-1 text-[11px]" onClick={() => router.post(`/settings/organizations/${organization.id}/export`)}>
                                <Download className="mr-1 h-3 w-3" />{t('Export')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Dialogs */}
            <ConfirmationDialog open={suspendOpen} onOpenChange={setSuspendOpen} title={t('Suspend Organization')} description={`${t('Are you sure you want to suspend')} "${organization.name}"?`} warningMessage={t('Monitoring will continue but users will see a suspension warning. The organization can be reactivated later.')} loading={actionLoading} onConfirm={handleSuspend} actionLabel={t('Suspend')} />
            <ConfirmationDialog open={reactivateOpen} onOpenChange={setReactivateOpen} title={t('Reactivate Organization')} description={`${t('Are you sure you want to reactivate')} "${organization.name}"?`} warningMessage={t('The organization will return to active status and all users will regain full access.')} loading={actionLoading} onConfirm={handleReactivate} actionLabel={t('Reactivate')} />
            <ConfirmationDialog open={archiveOpen} onOpenChange={setArchiveOpen} title={t('Archive Organization')} description={`${t('Are you sure you want to archive')} "${organization.name}"?`} warningMessage={t('This is a permanent action. Data will be retained for 12 months then deleted. The organization cannot be reactivated.')} loading={actionLoading} onConfirm={handleArchive} actionLabel={t('Archive')} />
        </AppLayout>
    );
}

/* -- Detail Row (sidebar) --------------------------------------------- */

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-2">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-medium text-foreground">{value}</span>
        </div>
    );
}

/* -- KPI Cell (full-width strip) -------------------------------------- */

function KpiCell({ label, value, accentColor }: { label: string; value: number; accentColor?: string }) {
    return (
        <div className="bg-card px-5 py-3.5">
            <p className={`font-display text-2xl font-extrabold tabular-nums ${accentColor ?? 'text-foreground'}`}>
                {value}
            </p>
            <p className="font-label text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
                {label}
            </p>
        </div>
    );
}

/* -- Notes Tab -------------------------------------------------------- */

function NotesTab({ organizationId, notes }: { organizationId: number; notes: OrganizationNote[] }) {
    const { t } = useLang();
    const form = useForm({ note: '' });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(`/settings/organizations/${organizationId}/notes`, { preserveScroll: true, onSuccess: () => form.reset() });
    }

    return (
        <Card className="border-border/10 shadow-none">
            <div className="p-5">
                <form onSubmit={handleSubmit} className="space-y-3">
                    <textarea
                        value={form.data.note}
                        onChange={(e) => form.setData('note', e.target.value)}
                        placeholder={t('Add a note about this organization...')}
                        rows={2}
                        className="w-full resize-none rounded-lg border-0 bg-accent/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring/30"
                    />
                    <div className="flex justify-end">
                        <Button size="sm" type="submit" disabled={form.processing || !form.data.note.trim()}>
                            {form.processing ? t('Saving...') : t('Post Note')}
                        </Button>
                    </div>
                </form>
            </div>
            {notes.length > 0 ? (
                <div className="divide-y divide-border/5">
                    {notes.map((note) => (
                        <div key={note.id} className="group px-5 py-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card">
                                    <span className="font-label text-[9px] font-bold text-muted-foreground">{note.user.name.charAt(0).toUpperCase()}</span>
                                </div>
                                <span className="text-xs font-medium text-foreground">{note.user.name}</span>
                                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{formatTimeAgo(note.created_at)}</span>
                                <Button variant="ghost" size="sm" className="ml-auto h-5 px-1.5 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-destructive-foreground group-hover:opacity-100" onClick={() => router.delete(`/settings/organizations/${organizationId}/notes/${note.id}`, { preserveScroll: true })}>{t('Delete')}</Button>
                            </div>
                            <p className="mt-2 pl-8 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{note.note}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2 px-5 pb-8 pt-4"><p className="text-xs text-muted-foreground">{t('No notes yet. Add one above.')}</p></div>
            )}
        </Card>
    );
}
