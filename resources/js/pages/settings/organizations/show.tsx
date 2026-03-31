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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimeInput } from '@/components/ui/time-input';
import { TimezoneSelect } from '@/components/ui/timezone-select';
import { AlertTriangle, Archive, ArrowLeft, Download, MapPin, MapPinPlus, Pencil, ShieldAlert, UserPlus, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/* -- Types ------------------------------------------------------------ */
interface SiteWithCounts { id: number; name: string; status: string; timezone: string | null; devices_count: number; gateways_count: number; online_devices_count: number; active_alerts_count: number; critical_alerts_count: number; open_work_orders_count: number; }
interface UserSummary { id: number; name: string; email: string; role: string; status: string; }
interface OrganizationDetail { id: number; name: string; slug: string; segment: string | null; plan: string | null; status: string; logo: string | null; branding: Record<string, string> | null; default_timezone: string | null; created_at: string; }
interface AlertFeedItem { id: number; severity: 'low' | 'medium' | 'high' | 'critical'; status: 'active' | 'acknowledged'; device_name: string; site_name: string; triggered_at: string; metric: string | null; value: number | null; threshold: number | null; rule_name: string | null; }
interface PrimaryContact { id: number; name: string; email: string; phone: string | null; }
interface OrganizationNote { id: number; note: string; created_at: string; user: { id: number; name: string }; }
interface Props { organization: OrganizationDetail; sites: SiteWithCounts[]; users: UserSummary[]; subscription?: Subscription | null; timezones: string[]; segments: string[]; primary_contact: PrimaryContact | null; last_user_activity: string | null; recent_alerts: AlertFeedItem[]; notes: OrganizationNote[]; }

/* -- Constants -------------------------------------------------------- */
const statusVariants: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = { active: 'success', onboarding: 'warning', suspended: 'destructive', archived: 'secondary' };
const segmentVariants: Record<string, 'info' | 'secondary' | 'outline' | 'warning' | 'success'> = { retail: 'info', cold_chain: 'secondary', industrial: 'warning', commercial: 'outline', foodservice: 'success' };
const siteStatusVariants: Record<string, 'success' | 'warning' | 'outline'> = { active: 'success', onboarding: 'warning', draft: 'outline', suspended: 'warning' };
const STATUS_COLORS: Record<string, string> = { active: '#10b981', onboarding: '#06b6d4', suspended: '#f43f5e', draft: '#374151', archived: '#374151' };
const ROLE_COLORS = ['#94a3b8', '#06b6d4', '#10b981', '#f43f5e', '#f59e0b', '#6b7280'];

/* -- Main Component --------------------------------------------------- */
export default function OrganizationShow({ organization, sites, users, subscription, timezones, primary_contact, last_user_activity, recent_alerts, notes }: Props) {
    const { t } = useLang();
    const [suspendOpen, setSuspendOpen] = useState(false);
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [reactivateOpen, setReactivateOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('sites');
    const [showAddSite, setShowAddSite] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Settings', href: '/settings/profile' },
        { title: 'Organizations', href: '/settings/organizations' },
        { title: organization.name, href: '#' },
    ];

    const totalDevices = sites.reduce((s, x) => s + x.devices_count, 0);
    const totalOnline = sites.reduce((s, x) => s + x.online_devices_count, 0);
    const totalGateways = sites.reduce((s, x) => s + x.gateways_count, 0);
    const totalAlerts = sites.reduce((s, x) => s + x.active_alerts_count, 0);
    const totalCritical = sites.reduce((s, x) => s + x.critical_alerts_count, 0);
    const totalWorkOrders = sites.reduce((s, x) => s + x.open_work_orders_count, 0);
    const healthPct = totalDevices > 0 ? Math.round((totalOnline / totalDevices) * 100) : 0;

    const siteStatusData = useMemo(() => { const c: Record<string, number> = {}; sites.forEach((s) => { c[s.status] = (c[s.status] ?? 0) + 1; }); return Object.entries(c).map(([st, v]) => ({ name: st.charAt(0).toUpperCase() + st.slice(1), value: v, fill: STATUS_COLORS[st] ?? '#374151' })); }, [sites]);
    const devicesPerSite = useMemo(() => sites.map((s) => ({ name: s.name.length > 12 ? s.name.substring(0, 12) + '…' : s.name, devices: s.devices_count, gateways: s.gateways_count })), [sites]);
    const roleData = useMemo(() => { const c: Record<string, number> = {}; users.forEach((u) => { const r = u.role.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()); c[r] = (c[r] ?? 0) + 1; }); return Object.entries(c).map(([r, v], i) => ({ name: r, value: v, fill: ROLE_COLORS[i % ROLE_COLORS.length] })); }, [users]);

    function handleSuspend() { setActionLoading(true); router.post(`/settings/organizations/${organization.id}/suspend`, {}, { preserveScroll: true, onFinish: () => { setActionLoading(false); setSuspendOpen(false); } }); }
    function handleReactivate() { setActionLoading(true); router.post(`/settings/organizations/${organization.id}/reactivate`, {}, { preserveScroll: true, onFinish: () => { setActionLoading(false); setReactivateOpen(false); } }); }
    function handleArchive() { setActionLoading(true); router.delete(`/settings/organizations/${organization.id}`, { onFinish: () => { setActionLoading(false); setArchiveOpen(false); } }); }

    const [activities, setActivities] = useState<Array<{ id: number; description: string; event: string; created_at: string; causer?: { id: number; name: string } }> | null>(null);
    const [activitiesLoading, setActivitiesLoading] = useState(false);
    useEffect(() => {
        if (activeTab === 'activity' && activities === null && !activitiesLoading) {
            setActivitiesLoading(true);
            fetch(`/activity-log/organization/${organization.id}`, { headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
                .then((r) => r.json()).then((d) => { setActivities(d); setActivitiesLoading(false); }).catch(() => { setActivities([]); setActivitiesLoading(false); });
        }
    }, [activeTab, activities, activitiesLoading, organization.id]);

    const siteColumns = useMemo<ColumnDef<SiteWithCounts>[]>(() => [
        { accessorKey: 'name', header: () => t('Site'), cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span> },
        { accessorKey: 'devices_count', header: () => t('Devices'), cell: ({ row }) => <span className="font-mono tabular-nums">{row.original.devices_count}</span> },
        { id: 'online', header: () => t('Online'), cell: ({ row }) => { const { devices_count: d, online_devices_count: o } = row.original; const p = d > 0 ? Math.round((o / d) * 100) : 0; return <span className={`font-mono text-xs font-semibold tabular-nums ${p >= 90 ? 'text-emerald-400' : p > 50 ? 'text-amber-400' : 'text-rose-400'}`}>{p}%</span>; } },
        { accessorKey: 'active_alerts_count', header: () => t('Alerts'), cell: ({ row }) => { const c = row.original.active_alerts_count; return <span className={`font-mono tabular-nums ${c > 0 ? 'text-rose-400' : 'text-muted-foreground'}`}>{c}</span>; } },
        { accessorKey: 'open_work_orders_count', header: () => t('Work Orders'), cell: ({ row }) => { const c = row.original.open_work_orders_count; return <span className={`font-mono tabular-nums ${c > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>{c}</span>; } },
        { accessorKey: 'status', header: () => t('Status'), cell: ({ row }) => <Badge variant={siteStatusVariants[row.original.status] ?? 'outline'} className="text-xs capitalize">{row.original.status}</Badge> },
    ], [t]);

    const userColumns = useMemo<ColumnDef<UserSummary>[]>(() => [
        { accessorKey: 'name', header: () => t('Name'), cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
        { accessorKey: 'email', header: () => t('Email'), cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.email}</span> },
        { accessorKey: 'role', header: () => t('Role'), cell: ({ row }) => <Badge variant="outline" className="text-xs capitalize">{row.original.role.replace(/_/g, ' ')}</Badge> },
        { accessorKey: 'status', header: () => t('Status'), cell: ({ row }) => <Badge variant={row.original.status === 'active' ? 'success' : 'secondary'} className="text-xs capitalize">{row.original.status}</Badge> },
    ], [t]);

    const brandingColors = [organization.branding?.primary_color, organization.branding?.secondary_color, organization.branding?.accent_color].filter(Boolean) as string[];
    const chartTooltipStyle = { borderRadius: 6, fontSize: 11, border: 'none', backgroundColor: 'rgba(17,19,24,0.95)', color: '#e0e4ea' };
    const sitesEmpty = (<div className="flex flex-col items-center gap-2 py-10"><MapPin className="h-6 w-6 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">{t('No sites configured')}</p></div>);
    const usersEmpty = (<div className="flex flex-col items-center gap-2 py-10"><Users className="h-6 w-6 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">{t('No users')}</p></div>);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${organization.name} — ${t('Organizations')}`} />
            <div className="obsidian flex h-full flex-1 flex-col bg-background p-5 md:p-8">

                {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn direction="down" duration={400}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <button onClick={() => router.get('/settings/organizations')} className="mb-2 flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground">
                                <ArrowLeft className="h-3 w-3" />{t('Organizations')}
                            </button>
                            <div className="flex flex-wrap items-center gap-3">
                                {organization.logo && (
                                    <img src={organization.logo} alt="" className="h-8 w-8 rounded-lg object-contain" />
                                )}
                                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[28px]">
                                    {organization.name}
                                </h1>
                                <span className="font-mono text-[11px] text-muted-foreground/40">{organization.slug}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <Badge variant={statusVariants[organization.status] ?? 'outline'} className="text-[10px] capitalize">{organization.status}</Badge>
                                {organization.segment && <Badge variant={segmentVariants[organization.segment] ?? 'outline'} className="text-[10px] capitalize">{organization.segment.replace('_', ' ')}</Badge>}
                                {organization.plan && <Badge variant="secondary" className="text-[10px] capitalize">{organization.plan}</Badge>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {['active', 'onboarding'].includes(organization.status) && (
                                <Button variant="ghost" size="sm" className="text-[11px] text-amber-400 hover:text-amber-300" onClick={() => setSuspendOpen(true)}>
                                    <ShieldAlert className="mr-1 h-3.5 w-3.5" />{t('Suspend')}
                                </Button>
                            )}
                            {organization.status === 'suspended' && (
                                <Button variant="ghost" size="sm" className="text-[11px] text-emerald-400" onClick={() => setReactivateOpen(true)}>{t('Reactivate')}</Button>
                            )}
                            {organization.status !== 'archived' && (
                                <Button variant="ghost" size="sm" className="text-[11px] text-rose-400 hover:text-rose-300" onClick={() => setArchiveOpen(true)}>
                                    <Archive className="mr-1 h-3.5 w-3.5" />{t('Archive')}
                                </Button>
                            )}
                            <Button variant="ghost" size="sm" className="text-[11px]" onClick={() => router.post(`/settings/organizations/${organization.id}/export`)}>
                                <Download className="mr-1 h-3.5 w-3.5" />{t('Export')}
                            </Button>
                            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => router.get('/settings/organization')}>
                                <Pencil className="mr-1.5 h-3.5 w-3.5" />{t('Edit')}
                            </Button>
                        </div>
                    </div>
                </FadeIn>

                {/* ━━ SUMMARY STRIP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={50} duration={400}>
                    <div className="mt-6 flex items-stretch overflow-hidden rounded-lg border border-border bg-card">
                        <SummaryStat label={t('Sites')} value={sites.length} />
                        <SummaryStat label={t('Devices')} value={totalDevices} subtitle={`${totalGateways} ${t('gateways')}`} />
                        <SummaryStat label={t('Online')} value={healthPct} suffix="%" color={healthPct >= 90 ? 'text-emerald-400' : healthPct > 50 ? 'text-amber-400' : 'text-rose-400'} />
                        <SummaryStat label={t('Alerts')} value={totalAlerts} color={totalAlerts > 0 ? 'text-rose-400' : undefined} subtitle={totalCritical > 0 ? `${totalCritical} ${t('critical')}` : undefined} />
                        <SummaryStat label={t('Work Orders')} value={totalWorkOrders} color={totalWorkOrders > 0 ? 'text-amber-400' : undefined} />
                        <SummaryStat label={t('Users')} value={users.length} last />
                    </div>
                </FadeIn>

                {/* ━━ DETAILS BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <FadeIn delay={75} duration={400}>
                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border/50 bg-card/50 px-5 py-3">
                        <DetailInline label={t('Timezone')} value={organization.default_timezone ?? '—'} mono />
                        <DetailInline label={t('Created')} value={formatTimeAgo(organization.created_at)} mono />
                        <DetailInline label={t('Last Active')} value={last_user_activity ? formatTimeAgo(last_user_activity) : '—'} mono accent={!!last_user_activity} />
                        {primary_contact && (
                            <DetailInline
                                label={t('Contact')}
                                value={`${primary_contact.name} · ${primary_contact.email}${primary_contact.phone ? ` · ${primary_contact.phone}` : ''}`}
                            />
                        )}
                        {subscription && (
                            <>
                                <DetailInline label={t('Subscription')} value={subscription.status} accent={subscription.status === 'active'} />
                                <DetailInline label={t('Contract')} value={subscription.contract_type} />
                            </>
                        )}
                        {!subscription && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground/40">{t('Subscription')}</span>
                                <span className="rounded bg-accent/50 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/40">{t('Coming soon')}</span>
                            </div>
                        )}
                        {brandingColors.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground/40">{t('Branding')}</span>
                                <div className="flex gap-1">{brandingColors.map((c) => <span key={c} className="h-4 w-4 rounded-full border border-border/50" style={{ backgroundColor: c }} />)}</div>
                            </div>
                        )}
                    </div>
                </FadeIn>

                {/* ━━ BREAKDOWN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <SectionDivider label={t('Breakdown')} />

                <FadeIn delay={100} duration={400}>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Card className="border-border shadow-none">
                            <CardContent>
                                <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50">{t('Sites by Status')}</p>
                                {siteStatusData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={100}>
                                        <BarChart data={siteStatusData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(30,34,40,0.6)" />
                                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                            <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 10, fill: '#b0b8c4' }} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(6,182,212,0.04)' }} />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>{siteStatusData.map((e) => <Cell key={e.name} fill={e.fill} />)}</Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <p className="py-6 text-center text-[10px] text-muted-foreground">{t('No data')}</p>}
                                <p className="mb-3 mt-5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50">{t('User Roles')}</p>
                                {roleData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={100}>
                                        <BarChart data={roleData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(30,34,40,0.6)" />
                                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9, fill: '#b0b8c4' }} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(6,182,212,0.04)' }} />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16}>{roleData.map((e) => <Cell key={e.name} fill={e.fill} />)}</Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <p className="py-6 text-center text-[10px] text-muted-foreground">{t('No data')}</p>}
                            </CardContent>
                        </Card>
                        <Card className="border-border shadow-none">
                            <CardContent>
                                <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/50">{t('Devices per Site')}</p>
                                {devicesPerSite.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={240}>
                                        <BarChart data={devicesPerSite} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(30,34,40,0.6)" />
                                            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                            <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(6,182,212,0.04)' }} />
                                            <Bar dataKey="devices" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={28} name={t('Devices')} />
                                            <Bar dataKey="gateways" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={28} name={t('Gateways')} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <p className="py-6 text-center text-[10px] text-muted-foreground">{t('No data')}</p>}
                            </CardContent>
                        </Card>
                    </div>
                </FadeIn>

                {/* ━━ DATA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <SectionDivider label={t('Data')} />

                <FadeIn delay={150} duration={400}>
                    {/* Tabs */}
                    <div className="flex items-center gap-1 border-b border-border/50">
                        {[
                            { key: 'sites', label: t('Sites'), count: sites.length },
                            { key: 'users', label: t('Users'), count: users.length },
                            { key: 'alerts', label: t('Alerts'), count: recent_alerts.length, isAlert: true },
                            { key: 'activity', label: t('Activity') },
                            { key: 'notes', label: t('Notes'), count: notes.length },
                        ].map((tab) => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] transition-colors ${activeTab === tab.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground/70'}`}>
                                {tab.label}
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${tab.isAlert && tab.count > 0 ? 'bg-rose-500/15 text-rose-400' : activeTab === tab.key ? 'bg-accent text-foreground' : 'bg-accent/50 text-muted-foreground'}`}>{tab.count}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="mt-4">
                        {activeTab === 'sites' && (
                            <div>
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="font-mono text-[10px] text-muted-foreground/30">{sites.length} {t('sites')}</span>
                                    <Dialog open={showAddSite} onOpenChange={setShowAddSite}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="text-[11px]">
                                                <MapPinPlus className="mr-1 h-3.5 w-3.5" />{t('Add Site')}
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-lg">
                                            <DialogHeader><DialogTitle>{t('Add Site')}</DialogTitle></DialogHeader>
                                            <AddSiteForm timezones={timezones} onSuccess={() => setShowAddSite(false)} />
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <Card className="editorial-table border-border shadow-none">
                                    <DataTable columns={siteColumns} data={sites} getRowId={(r) => String(r.id)} onRowClick={(s) => router.get(`/sites/${s.id}`)} bordered={false} emptyState={sitesEmpty} />
                                </Card>
                            </div>
                        )}
                        {activeTab === 'users' && (
                            <div>
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="font-mono text-[10px] text-muted-foreground/30">{users.length} {t('members')}</span>
                                    <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="text-[11px]">
                                                <UserPlus className="mr-1 h-3.5 w-3.5" />{t('Add Member')}
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-lg">
                                            <DialogHeader><DialogTitle>{t('Add Member')}</DialogTitle></DialogHeader>
                                            <AddMemberForm onSuccess={() => setShowAddMember(false)} />
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <Card className="editorial-table border-border shadow-none">
                                    <DataTable columns={userColumns} data={users} getRowId={(r) => String(r.id)} bordered={false} emptyState={usersEmpty} />
                                </Card>
                            </div>
                        )}
                        {activeTab === 'alerts' && (
                            <Card className="border-border shadow-none">
                                {recent_alerts.length > 0 ? (
                                    <div className="divide-y divide-border/30">{recent_alerts.map((alert) => {
                                        const sev: Record<string, string> = { critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-amber-500', low: 'bg-slate-400' };
                                        return (<div key={alert.id} className="flex cursor-pointer items-start gap-3 px-5 py-4 transition-colors hover:bg-accent/20" onClick={() => router.get(`/alerts/${alert.id}`)}>
                                            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${sev[alert.severity] ?? 'bg-muted-foreground'}`} />
                                            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-medium text-foreground">{alert.rule_name ?? alert.metric ?? t('Alert')}</p><Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'} className="shrink-0 text-[9px] capitalize">{alert.severity}</Badge></div><p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{alert.device_name} @ {alert.site_name}</p></div>
                                            <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">{formatTimeAgo(alert.triggered_at)}</span>
                                        </div>);
                                    })}</div>
                                ) : <div className="flex flex-col items-center gap-2 py-10"><AlertTriangle className="h-6 w-6 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">{t('No active alerts')}</p></div>}
                            </Card>
                        )}
                        {activeTab === 'activity' && (
                            <Card className="border-border shadow-none">
                                {activitiesLoading ? <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="flex items-center gap-3"><Skeleton className="h-7 w-7 rounded-full" /><div className="flex-1 space-y-1"><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-48" /></div></div>))}</div>
                                : activities && activities.length > 0 ? <div className="divide-y divide-border/30">{activities.map((a) => (<div key={a.id} className="flex items-start gap-3 px-5 py-3.5"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/50"><span className="font-mono text-[10px] font-medium text-muted-foreground">{a.causer?.name?.charAt(0)?.toUpperCase() ?? '?'}</span></div><div className="min-w-0 flex-1 pt-0.5"><p className="text-[13px]"><span className="font-medium text-foreground">{a.causer?.name ?? t('System')}</span> <span className="text-muted-foreground">{a.description}</span></p></div><span className="shrink-0 pt-1 font-mono text-[10px] tabular-nums text-muted-foreground">{formatTimeAgo(a.created_at)}</span></div>))}</div>
                                : <div className="flex flex-col items-center gap-2 py-10"><Users className="h-6 w-6 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">{t('No activity')}</p></div>}
                            </Card>
                        )}
                        {activeTab === 'notes' && <NotesTab organizationId={organization.id} notes={notes} />}
                    </div>
                </FadeIn>
            </div>

            <ConfirmationDialog open={suspendOpen} onOpenChange={setSuspendOpen} title={t('Suspend Organization')} description={`${t('Are you sure you want to suspend')} "${organization.name}"?`} warningMessage={t('Users will see a suspension warning.')} loading={actionLoading} onConfirm={handleSuspend} actionLabel={t('Suspend')} />
            <ConfirmationDialog open={reactivateOpen} onOpenChange={setReactivateOpen} title={t('Reactivate Organization')} description={`${t('Are you sure you want to reactivate')} "${organization.name}"?`} warningMessage={t('Full access will be restored.')} loading={actionLoading} onConfirm={handleReactivate} actionLabel={t('Reactivate')} />
            <ConfirmationDialog open={archiveOpen} onOpenChange={setArchiveOpen} title={t('Archive Organization')} description={`${t('Are you sure you want to archive')} "${organization.name}"?`} warningMessage={t('Data retained for 12 months.')} loading={actionLoading} onConfirm={handleArchive} actionLabel={t('Archive')} />
        </AppLayout>
    );
}

/* -- Helpers ---------------------------------------------------------- */

function SummaryStat({ label, value, suffix, subtitle, color, last }: { label: string; value: number; suffix?: string; subtitle?: string; color?: string; last?: boolean }) {
    return (
        <div className={`flex flex-1 flex-col items-center gap-1 py-5 ${!last ? 'border-r border-border/50' : ''}`}>
            <span className={`font-display text-4xl font-bold leading-none tracking-tight ${color ?? 'text-foreground'}`}>
                {value}{suffix && <span className="text-2xl">{suffix}</span>}
            </span>
            <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground/50">{label}</span>
            {subtitle && <span className="font-mono text-[9px] text-muted-foreground/30">{subtitle}</span>}
        </div>
    );
}

function SectionDivider({ label }: { label: string }) {
    return (
        <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-border/50" />
            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/30">{label.toUpperCase()}</span>
            <div className="h-px flex-1 bg-border/50" />
        </div>
    );
}

function DetailInline({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/40">{label}</span>
            <span className={`text-[12px] ${mono ? 'font-mono text-[11px]' : ''} ${accent ? 'text-emerald-400' : 'text-foreground/80'}`}>{value}</span>
        </div>
    );
}

/* -- Notes ------------------------------------------------------------ */

function NotesTab({ organizationId, notes }: { organizationId: number; notes: OrganizationNote[] }) {
    const { t } = useLang();
    const form = useForm({ note: '' });
    function handleSubmit(e: React.FormEvent) { e.preventDefault(); form.post(`/settings/organizations/${organizationId}/notes`, { preserveScroll: true, onSuccess: () => form.reset() }); }

    return (
        <Card className="border-border shadow-none">
            <div className="p-5">
                <form onSubmit={handleSubmit} className="space-y-3">
                    <textarea value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} placeholder={t('Add a note about this organization...')} rows={3}
                        className="w-full resize-none rounded-lg border border-border bg-accent/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30" />
                    <div className="flex justify-end">
                        <Button size="sm" type="submit" disabled={form.processing || !form.data.note.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            {form.processing ? t('Saving...') : t('Post Note')}
                        </Button>
                    </div>
                </form>
            </div>
            {notes.length > 0 ? (
                <div className="divide-y divide-border/30">{notes.map((note) => (
                    <div key={note.id} className="group px-5 py-4">
                        <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/50"><span className="font-mono text-[9px] font-medium text-muted-foreground">{note.user.name.charAt(0).toUpperCase()}</span></div>
                            <span className="text-xs font-medium text-foreground">{note.user.name}</span>
                            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{formatTimeAgo(note.created_at)}</span>
                            <Button variant="ghost" size="sm" className="ml-auto h-5 px-1.5 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100" onClick={() => router.delete(`/settings/organizations/${organizationId}/notes/${note.id}`, { preserveScroll: true })}>{t('Delete')}</Button>
                        </div>
                        <p className="mt-2 pl-8 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/70">{note.note}</p>
                    </div>
                ))}</div>
            ) : <div className="flex flex-col items-center gap-2 px-5 pb-8 pt-4"><p className="text-xs text-muted-foreground">{t('No notes yet.')}</p></div>}
        </Card>
    );
}

/* -- Add Site Form ---------------------------------------------------- */

function AddSiteForm({ timezones, onSuccess }: { timezones: string[]; onSuccess: () => void }) {
    const { t } = useLang();
    const form = useForm({ name: '', address: '', timezone: 'America/Mexico_City', opening_hour: '', status: 'draft' });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post('/settings/sites', { preserveScroll: true, onSuccess: () => { form.reset(); onSuccess(); } });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>{t('Site Name')}</Label>
                <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder={t('e.g. CEDIS Monterrey')} />
                {form.errors.name && <p className="text-[11px] text-destructive-foreground">{form.errors.name}</p>}
            </div>
            <div className="space-y-2">
                <Label>{t('Address')}</Label>
                <Input value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} placeholder={t('Optional')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{t('Timezone')}</Label>
                    <TimezoneSelect timezones={timezones} value={form.data.timezone} onValueChange={(v) => form.setData('timezone', v)} />
                    {form.errors.timezone && <p className="text-[11px] text-destructive-foreground">{form.errors.timezone}</p>}
                </div>
                <div className="space-y-2">
                    <Label>{t('Opening Hour')}</Label>
                    <TimeInput value={form.data.opening_hour} onChange={(v) => form.setData('opening_hour', v)} />
                </div>
            </div>
            <div className="space-y-2">
                <Label>{t('Status')}</Label>
                <Select value={form.data.status} onValueChange={(v) => form.setData('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="draft">{t('Draft')}</SelectItem>
                        <SelectItem value="active">{t('Active')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={form.processing}>
                {form.processing ? t('Creating...') : t('Create Site')}
            </Button>
        </form>
    );
}

/* -- Add Member Form -------------------------------------------------- */

function AddMemberForm({ onSuccess }: { onSuccess: () => void }) {
    const { t } = useLang();
    const form = useForm({ name: '', email: '', password: '', role: 'client_site_viewer' });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post('/settings/users', { preserveScroll: true, onSuccess: () => { form.reset(); onSuccess(); } });
    }

    const CLIENT_ROLES = [
        { value: 'client_org_admin', label: 'Organization Admin' },
        { value: 'client_site_manager', label: 'Site Manager' },
        { value: 'client_site_viewer', label: 'Site Viewer' },
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>{t('Name')}</Label>
                <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder={t('Full name')} />
                {form.errors.name && <p className="text-[11px] text-destructive-foreground">{form.errors.name}</p>}
            </div>
            <div className="space-y-2">
                <Label>{t('Email')}</Label>
                <Input type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} placeholder={t('user@company.com')} />
                {form.errors.email && <p className="text-[11px] text-destructive-foreground">{form.errors.email}</p>}
            </div>
            <div className="space-y-2">
                <Label>{t('Password')}</Label>
                <Input type="password" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} placeholder={t('Temporary password')} />
                {form.errors.password && <p className="text-[11px] text-destructive-foreground">{form.errors.password}</p>}
            </div>
            <div className="space-y-2">
                <Label>{t('Role')}</Label>
                <Select value={form.data.role} onValueChange={(v) => form.setData('role', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {CLIENT_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{t(r.label)}</SelectItem>)}
                    </SelectContent>
                </Select>
                {form.errors.role && <p className="text-[11px] text-destructive-foreground">{form.errors.role}</p>}
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={form.processing}>
                {form.processing ? t('Creating...') : t('Add Member')}
            </Button>
        </form>
    );
}
