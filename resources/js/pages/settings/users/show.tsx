import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Pencil, ShieldAlert, Smartphone, Trash2 } from 'lucide-react';
import { useState } from 'react';

/* -- Types ------------------------------------------------------------ */

interface UserDetail {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    whatsapp_phone: string | null;
    has_app_access: boolean;
    role: string | null;
    organization_name: string | null;
    deactivated_at: string | null;
    created_at: string;
}

interface SiteAccess {
    id: number;
    name: string;
    status: string;
    devices_count: number;
}

interface ActivityItem {
    id: number;
    description: string;
    event: string;
    created_at: string;
}

interface WorkOrderItem {
    id: number;
    title: string;
    status: string;
    priority: string;
    site_name: string | null;
    created_at: string;
}

interface Props {
    user: UserDetail;
    sites: SiteAccess[];
    activities: ActivityItem[];
    work_orders: WorkOrderItem[];
    last_activity: string | null;
    is_super_admin: boolean;
}

/* -- Constants -------------------------------------------------------- */

const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Super Admin', support: 'Support', account_manager: 'Account Manager',
    technician: 'Technician', client_org_admin: 'Org Admin',
    client_site_manager: 'Site Manager', client_site_viewer: 'Site Viewer',
};

const roleBadgeVariant: Record<string, 'success' | 'secondary' | 'outline'> = {
    client_org_admin: 'success', client_site_manager: 'secondary', client_site_viewer: 'outline',
    technician: 'outline', super_admin: 'success', support: 'secondary', account_manager: 'secondary',
};

/* -- Main Component --------------------------------------------------- */

export default function UserShow({ user, sites, activities, work_orders, last_activity, is_super_admin }: Props) {
    const { t } = useLang();
    const [deactivateOpen, setDeactivateOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Settings', href: '/settings/profile' },
        { title: 'Users', href: '/settings/users' },
        { title: user.name, href: '#' },
    ];

    const isDeactivated = !!user.deactivated_at;
    const initials = user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

    function handleDeactivate() {
        setActionLoading(true);
        router.post(`/settings/users/${user.id}/deactivate`, {}, {
            preserveScroll: true,
            onFinish: () => { setActionLoading(false); setDeactivateOpen(false); },
        });
    }

    function handleReactivate() {
        setActionLoading(true);
        router.post(`/settings/users/${user.id}/reactivate`, {}, {
            preserveScroll: true,
            onFinish: () => { setActionLoading(false); },
        });
    }

    function handleDelete() {
        setActionLoading(true);
        router.delete(`/settings/users/${user.id}`, {
            onFinish: () => { setActionLoading(false); setDeleteOpen(false); },
            onSuccess: () => router.get('/settings/users'),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${user.name} — ${t('Users')}`} />
            <div className="obsidian flex h-full flex-1 flex-col bg-background">
                <div className="mx-auto w-full max-w-4xl px-5 py-8 md:px-8">

                    {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                    <FadeIn direction="down" duration={400}>
                        <button onClick={() => router.get('/settings/users')} className="mb-4 flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground">
                            <ArrowLeft className="h-3 w-3" />{t('Users')}
                        </button>

                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-5">
                                {/* Avatar */}
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <span className="font-display text-xl font-bold">{initials}</span>
                                </div>
                                <div>
                                    <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                                        {user.name}
                                    </h1>
                                    <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">{user.email}</p>
                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        {user.role && (
                                            <Badge variant={roleBadgeVariant[user.role] ?? 'outline'} className="text-[10px]">
                                                {t(ROLE_LABELS[user.role] ?? user.role.replace(/_/g, ' '))}
                                            </Badge>
                                        )}
                                        <Badge variant={isDeactivated ? 'destructive' : 'success'} className="text-[10px]">
                                            {isDeactivated ? t('Deactivated') : t('Active')}
                                        </Badge>
                                        {user.has_app_access && (
                                            <Badge variant="outline" className="gap-1 text-[10px]">
                                                <Smartphone className="h-2.5 w-2.5" />{t('App')}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                {isDeactivated ? (
                                    <Button variant="outline" size="sm" className="text-[11px] text-emerald-600 dark:text-emerald-400 border-border hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" onClick={handleReactivate}>
                                        {t('Reactivate')}
                                    </Button>
                                ) : (
                                    <Button variant="outline" size="sm" className="text-[11px] text-amber-600 dark:text-amber-400 border-border hover:border-amber-300 dark:hover:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30" onClick={() => setDeactivateOpen(true)}>
                                        <ShieldAlert className="mr-1 h-3.5 w-3.5" />{t('Deactivate')}
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" className="text-[11px] bg-accent hover:bg-accent/80 dark:bg-accent dark:hover:bg-accent/60" onClick={() => router.get('/settings/users')}>
                                    <Pencil className="mr-1 h-3.5 w-3.5" />{t('Edit')}
                                </Button>
                            </div>
                        </div>
                    </FadeIn>

                    {/* ━━ DETAILS BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                    <FadeIn delay={50} duration={400}>
                        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border/50 bg-card/50 px-5 py-3">
                            {user.phone && <DetailInline label={t('Phone')} value={user.phone} mono />}
                            {user.whatsapp_phone && <DetailInline label={t('WhatsApp')} value={user.whatsapp_phone} mono />}
                            {user.organization_name && <DetailInline label={t('Organization')} value={user.organization_name} />}
                            <DetailInline label={t('Created')} value={formatTimeAgo(user.created_at)} mono />
                            <DetailInline label={t('Last Active')} value={last_activity ? formatTimeAgo(last_activity) : '—'} mono accent={!!last_activity} />
                        </div>
                    </FadeIn>

                    {/* ━━ SITE ACCESS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                    <SectionDivider label={t('Site Access')} />

                    <FadeIn delay={100} duration={400}>
                        <Card className="border-border shadow-none">
                            {sites.length > 0 ? (
                                <div className="divide-y divide-border/30">
                                    {sites.map((site) => (
                                        <div
                                            key={site.id}
                                            className="flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors hover:bg-accent/20"
                                            onClick={() => router.get(`/sites/${site.id}`)}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13px] font-medium text-foreground">{site.name}</p>
                                            </div>
                                            <Badge variant={site.status === 'active' ? 'success' : 'outline'} className="text-[10px] capitalize">{site.status}</Badge>
                                            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{site.devices_count} {t('devices')}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 py-10">
                                    <p className="text-[13px] text-muted-foreground">{t('No site access assigned')}</p>
                                </div>
                            )}
                        </Card>
                    </FadeIn>

                    {/* ━━ RECENT ACTIVITY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                    <SectionDivider label={t('Recent Activity')} />

                    <FadeIn delay={150} duration={400}>
                        <Card className="border-border shadow-none">
                            {activities.length > 0 ? (
                                <div className="divide-y divide-border/30">
                                    {activities.map((a) => (
                                        <div key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/50">
                                                <span className="font-mono text-[10px] font-medium text-muted-foreground">
                                                    {initials.charAt(0)}
                                                </span>
                                            </div>
                                            <p className="min-w-0 flex-1 text-[13px] text-muted-foreground">{a.description}</p>
                                            <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/70">{formatTimeAgo(a.created_at)}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 py-10">
                                    <p className="text-[13px] text-muted-foreground">{t('No activity recorded')}</p>
                                </div>
                            )}
                        </Card>
                    </FadeIn>

                    {/* ━━ ASSIGNED WORK ORDERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                    {work_orders.length > 0 && (
                        <>
                            <SectionDivider label={t('Assigned Work Orders')} />
                            <FadeIn delay={200} duration={400}>
                                <Card className="border-border shadow-none">
                                    <div className="divide-y divide-border/30">
                                        {work_orders.map((wo) => {
                                            const priorityColors: Record<string, string> = { critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-amber-500', low: 'bg-slate-400' };
                                            return (
                                                <div key={wo.id} className="flex cursor-pointer items-center gap-3 px-5 py-3.5 transition-colors hover:bg-accent/20" onClick={() => router.get(`/work-orders/${wo.id}`)}>
                                                    <span className={`h-2 w-2 shrink-0 rounded-full ${priorityColors[wo.priority] ?? 'bg-slate-400'}`} />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[13px] font-medium text-foreground">{wo.title}</p>
                                                        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{wo.site_name}</p>
                                                    </div>
                                                    <Badge variant="outline" className="text-[9px] capitalize">{wo.status}</Badge>
                                                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/70">{formatTimeAgo(wo.created_at)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            </FadeIn>
                        </>
                    )}

                    {/* ━━ DANGER ZONE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                    <FadeIn delay={250} duration={400}>
                        <div className="mt-10 border-t border-rose-500/10 pt-6">
                            <p className="mb-4 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-rose-600 dark:text-rose-400/70">{t('Danger Zone')}</p>
                            <div className="space-y-3">
                                {!isDeactivated && (
                                    <div className="flex items-center justify-between rounded-lg border border-border px-5 py-4">
                                        <div>
                                            <p className="text-[13px] font-medium text-foreground">{t('Deactivate Account')}</p>
                                            <p className="mt-0.5 text-[11px] text-muted-foreground">{t('The user will lose access but data is preserved.')}</p>
                                        </div>
                                        <Button variant="outline" size="sm" className="text-[11px] text-amber-600 dark:text-amber-400 border-border hover:border-amber-300 dark:hover:border-amber-800" onClick={() => setDeactivateOpen(true)}>
                                            {t('Deactivate')}
                                        </Button>
                                    </div>
                                )}
                                <div className="flex items-center justify-between rounded-lg border border-border px-5 py-4">
                                    <div>
                                        <p className="text-[13px] font-medium text-foreground">{t('Delete User')}</p>
                                        <p className="mt-0.5 text-[11px] text-muted-foreground">{t('Permanently delete this user and remove all site access.')}</p>
                                    </div>
                                    <Button variant="outline" size="sm" className="text-[11px] text-rose-600 dark:text-rose-400 border-border hover:border-rose-300 dark:hover:border-rose-800" onClick={() => setDeleteOpen(true)}>
                                        <Trash2 className="mr-1 h-3.5 w-3.5" />{t('Delete')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </div>

            {/* Confirmation Dialogs */}
            <ConfirmationDialog open={deactivateOpen} onOpenChange={setDeactivateOpen} title={t('Deactivate User')} description={`${t('Are you sure you want to deactivate')} ${user.name}?`} warningMessage={t('The user will lose access but data is preserved.')} loading={actionLoading} onConfirm={handleDeactivate} actionLabel={t('Deactivate')} />
            <ConfirmationDialog open={deleteOpen} onOpenChange={setDeleteOpen} title={t('Delete User')} description={`${t('Are you sure you want to delete')} ${user.name}?`} warningMessage={t('This action cannot be undone.')} loading={actionLoading} onConfirm={handleDelete} actionLabel={t('Delete')} />
        </AppLayout>
    );
}

/* -- Helpers ---------------------------------------------------------- */

function SectionDivider({ label }: { label: string }) {
    return (
        <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-border/50" />
            <span className="font-mono text-[10px] font-medium tracking-[0.15em] text-muted-foreground/70">{label.toUpperCase()}</span>
            <div className="h-px flex-1 bg-border/50" />
        </div>
    );
}

function DetailInline({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{label}</span>
            <span className={`text-[12px] ${mono ? 'font-mono text-[11px]' : ''} ${accent ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground/80'}`}>{value}</span>
        </div>
    );
}
