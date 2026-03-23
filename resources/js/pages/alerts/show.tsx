import { Can } from '@/components/Can';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { Alert, AlertNotificationRecord, BreadcrumbItem, CorrectiveAction, SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertTriangle,
    ArrowLeft,
    Bell,
    CheckCircle2,
    ClipboardCheck,
    Clock,
    Cpu,
    Eye,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Plus,
    ShieldAlert,
    Timer,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';

interface AlertSnoozeData {
    id: number;
    expires_at: string;
}

interface Props {
    alert: Alert & {
        notifications?: AlertNotificationRecord[];
    };
    userSnooze?: AlertSnoozeData | null;
}

export default function AlertShow({ alert, userSnooze }: Props) {
    const { t } = useLang();
    const { auth } = usePage<SharedData>().props;
    const data = alert.data;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Alerts', href: '/alerts' },
        { title: `Alert #${alert.id}`, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Alert')} #${alert.id}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.get('/alerts')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">
                                {data?.rule_name ?? `Alert #${alert.id}`}
                            </h1>
                            <SeverityBadge severity={alert.severity} />
                            <StatusBadge status={alert.status} />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t('Triggered')} {new Date(alert.triggered_at).toLocaleString()}
                        </p>
                        {userSnooze && (
                            <div className="mt-1 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                                <Timer className="h-3 w-3" />
                                {t('Snoozed until')} {new Date(userSnooze.expires_at).toLocaleTimeString()}
                                <button
                                    className="text-xs underline hover:text-foreground"
                                    onClick={() =>
                                        router.delete(`/alerts/${alert.id}/snooze`, { preserveScroll: true })
                                    }
                                >
                                    {t('Cancel')}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <Can permission="acknowledge alerts">
                        <div className="flex gap-2">
                            {alert.status === 'active' && (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() =>
                                            router.post(`/alerts/${alert.id}/acknowledge`, {}, { preserveScroll: true })
                                        }
                                    >
                                        <Eye className="mr-2 h-4 w-4" />
                                        {t('Acknowledge')}
                                    </Button>
                                    <Button
                                        onClick={() =>
                                            router.post(`/alerts/${alert.id}/resolve`, {}, { preserveScroll: true })
                                        }
                                    >
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        {t('Resolve')}
                                    </Button>
                                </>
                            )}
                            {alert.status === 'acknowledged' && (
                                <Button
                                    onClick={() =>
                                        router.post(`/alerts/${alert.id}/resolve`, {}, { preserveScroll: true })
                                    }
                                >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    {t('Resolve')}
                                </Button>
                            )}
                            {['active', 'acknowledged'].includes(alert.status) && (
                                <>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <Timer className="mr-2 h-4 w-4" />
                                                {userSnooze ? t('Snoozed') : t('Snooze')}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {[
                                                { mins: 30, label: '30 min' },
                                                { mins: 60, label: '1 hour' },
                                                { mins: 120, label: '2 hours' },
                                                { mins: 240, label: '4 hours' },
                                                { mins: 480, label: '8 hours' },
                                            ].map(({ mins, label }) => (
                                                <DropdownMenuItem
                                                    key={mins}
                                                    onClick={() =>
                                                        router.post(
                                                            `/alerts/${alert.id}/snooze`,
                                                            { duration_minutes: mins },
                                                            { preserveScroll: true },
                                                        )
                                                    }
                                                >
                                                    {label}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Can permission="manage alert rules">
                                        <Button
                                            variant="ghost"
                                            onClick={() =>
                                                router.post(`/alerts/${alert.id}/dismiss`, {}, { preserveScroll: true })
                                            }
                                        >
                                            <XCircle className="mr-2 h-4 w-4" />
                                            {t('Dismiss')}
                                        </Button>
                                    </Can>
                                </>
                            )}
                        </div>
                    </Can>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    {/* Main content */}
                    <div className="space-y-6">
                        {/* Sensor data at trigger */}
                        {data && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('Trigger Details')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        <InfoBlock
                                            icon={<Cpu className="h-4 w-4" />}
                                            label={t('Device')}
                                            value={data.device_name}
                                            sub={data.device_model}
                                        />
                                        <InfoBlock
                                            icon={<MapPin className="h-4 w-4" />}
                                            label={t('Zone')}
                                            value={data.zone ?? '—'}
                                        />
                                        <InfoBlock
                                            label={t('Metric')}
                                            value={data.metric}
                                            sub={`${data.condition} ${data.threshold}`}
                                        />
                                        <div className="rounded-lg border p-3">
                                            <p className="text-xs text-muted-foreground">{t('Value at trigger')}</p>
                                            <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
                                                {data.value}
                                            </p>
                                            {data.threshold !== null && (
                                                <p className="text-xs text-muted-foreground">
                                                    {t('Threshold')}: {data.threshold}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Notification log */}
                        {alert.notifications && alert.notifications.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">{t('Notification Log')}</CardTitle>
                                    <CardDescription>
                                        {alert.notifications.length} {t('notification(s) sent')}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {alert.notifications.map((notif) => (
                                            <div
                                                key={notif.id}
                                                className="flex items-center justify-between rounded-lg border p-3"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <ChannelIcon channel={notif.channel} />
                                                    <div>
                                                        <p className="text-sm font-medium">
                                                            {notif.user?.name ?? `User #${notif.user_id}`}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            via {notif.channel}
                                                            {notif.sent_at && (
                                                                <> · {new Date(notif.sent_at).toLocaleTimeString()}</>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge
                                                    variant={
                                                        notif.status === 'delivered'
                                                            ? 'success'
                                                            : notif.status === 'failed'
                                                              ? 'destructive'
                                                              : 'outline'
                                                    }
                                                    className="text-xs"
                                                >
                                                    {notif.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Corrective Actions — only for critical/high alerts (Phase 10, WF-013) */}
                        {['critical', 'high'].includes(alert.severity) && (
                            <CorrectiveActionsSection alert={alert} currentUserId={auth.user.id} />
                        )}
                    </div>

                    {/* Sidebar: Timeline */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Timeline')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="relative space-y-0">
                                    {/* Triggered */}
                                    <TimelineEntry
                                        icon={<ShieldAlert className="h-3.5 w-3.5" />}
                                        label={t('Triggered')}
                                        time={alert.triggered_at}
                                        color="destructive"
                                        isFirst
                                    />

                                    {/* Acknowledged */}
                                    {alert.acknowledged_at ? (
                                        <TimelineEntry
                                            icon={<Eye className="h-3.5 w-3.5" />}
                                            label={t('Acknowledged')}
                                            time={alert.acknowledged_at}
                                            color="warning"
                                        />
                                    ) : alert.status === 'active' ? (
                                        <TimelineEntry
                                            icon={<Clock className="h-3.5 w-3.5" />}
                                            label={t('Awaiting acknowledgment')}
                                            color="muted"
                                            pending
                                        />
                                    ) : null}

                                    {/* Resolved */}
                                    {alert.resolved_at ? (
                                        <TimelineEntry
                                            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                                            label={
                                                alert.resolution_type === 'auto'
                                                    ? t('Auto-resolved')
                                                    : alert.resolution_type === 'dismissed'
                                                      ? t('Dismissed')
                                                      : t('Resolved')
                                            }
                                            time={alert.resolved_at}
                                            sub={
                                                alert.resolved_by_user
                                                    ? `${t('by')} ${alert.resolved_by_user.name}`
                                                    : undefined
                                            }
                                            color="success"
                                            isLast
                                        />
                                    ) : (
                                        <TimelineEntry
                                            icon={<Clock className="h-3.5 w-3.5" />}
                                            label={t('Awaiting resolution')}
                                            color="muted"
                                            pending
                                            isLast
                                        />
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">{t('Details')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <DetailRow label={t('Alert ID')} value={`#${alert.id}`} />
                                <DetailRow label={t('Severity')} value={alert.severity} />
                                <DetailRow
                                    label={t('Site')}
                                    value={alert.site?.name ?? '—'}
                                />
                                {alert.rule && (
                                    <DetailRow label={t('Rule')} value={alert.rule.name} />
                                )}
                                <DetailRow
                                    label={t('Resolution')}
                                    value={alert.resolution_type ?? '—'}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

/* ── Sub-components ───────────────────────────────── */

function InfoBlock({
    icon,
    label,
    value,
    sub,
}: {
    icon?: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
}) {
    return (
        <div className="rounded-lg border p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {icon}
                {label}
            </div>
            <p className="mt-1 text-sm font-medium">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
    );
}

function TimelineEntry({
    icon,
    label,
    time,
    sub,
    color,
    pending,
    isFirst,
    isLast,
}: {
    icon: React.ReactNode;
    label: string;
    time?: string;
    sub?: string;
    color: string;
    pending?: boolean;
    isFirst?: boolean;
    isLast?: boolean;
}) {
    const colorClasses: Record<string, string> = {
        destructive: 'bg-red-500 text-white',
        warning: 'bg-amber-500 text-white',
        success: 'bg-emerald-500 text-white',
        muted: 'bg-muted text-muted-foreground border',
    };

    return (
        <div className="relative flex gap-3 pb-6 last:pb-0">
            {/* Connector line */}
            {!isLast && (
                <div className="absolute left-[13px] top-7 h-full w-px bg-border" />
            )}

            {/* Dot */}
            <div
                className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    colorClasses[color] ?? colorClasses.muted
                } ${pending ? 'opacity-50' : ''}`}
            >
                {icon}
            </div>

            {/* Content */}
            <div className={pending ? 'opacity-50' : ''}>
                <p className="text-sm font-medium">{label}</p>
                {time && (
                    <p className="text-xs text-muted-foreground">
                        {new Date(time).toLocaleString()}
                    </p>
                )}
                {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            </div>
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

function ChannelIcon({ channel }: { channel: string }) {
    const icons: Record<string, React.ReactNode> = {
        whatsapp: <MessageSquare className="h-4 w-4 text-emerald-500" />,
        push: <Bell className="h-4 w-4 text-blue-500" />,
        email: <Mail className="h-4 w-4 text-amber-500" />,
        sms: <Phone className="h-4 w-4 text-purple-500" />,
    };

    return (
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
            {icons[channel] ?? <Bell className="h-4 w-4" />}
        </div>
    );
}

function SeverityBadge({ severity }: { severity: string }) {
    const config: Record<string, { variant: 'destructive' | 'warning' | 'info' | 'outline'; icon: typeof ShieldAlert }> = {
        critical: { variant: 'destructive', icon: ShieldAlert },
        high: { variant: 'warning', icon: AlertTriangle },
        medium: { variant: 'info', icon: Bell },
        low: { variant: 'outline', icon: Bell },
    };
    const { variant, icon: Icon } = config[severity] ?? config.low;
    return (
        <Badge variant={variant} className="gap-1">
            <Icon className="h-3 w-3" />
            {severity}
        </Badge>
    );
}

function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, 'destructive' | 'warning' | 'success' | 'outline'> = {
        active: 'destructive',
        acknowledged: 'warning',
        resolved: 'success',
        dismissed: 'outline',
    };
    return <Badge variant={variants[status] ?? 'outline'}>{status}</Badge>;
}

/* ── Corrective Actions Section (Phase 10) ───────── */

function CorrectiveActionsSection({ alert, currentUserId }: { alert: Props['alert']; currentUserId: number }) {
    const { t } = useLang();
    const [showForm, setShowForm] = useState(false);

    const caForm = useForm({ action_taken: '', notes: '' });

    const actions = alert.corrective_actions ?? [];
    const allVerified = actions.length > 0 && actions.every((ca) => ca.status === 'verified');

    const submitAction = (e: React.FormEvent) => {
        e.preventDefault();
        caForm.post(`/alerts/${alert.id}/corrective-actions`, {
            preserveScroll: true,
            onSuccess: () => {
                caForm.reset();
                setShowForm(false);
            },
        });
    };

    const verifyAction = (ca: CorrectiveAction) => {
        router.post(`/alerts/${alert.id}/corrective-actions/${ca.id}/verify`, {}, { preserveScroll: true });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ClipboardCheck className="h-4 w-4" />
                        {t('Corrective Actions')}
                        {actions.length > 0 && (
                            <Badge variant={allVerified ? 'success' : 'warning'} className="text-xs">
                                {actions.length}
                            </Badge>
                        )}
                    </CardTitle>
                    {allVerified && actions.length > 0 && (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {t('All verified')} ✓
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Warning banner when no actions logged */}
                {actions.length === 0 && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div>
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                {t('Corrective action required')}
                            </p>
                            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                                {t('This excursion requires a corrective action for COFEPRIS compliance. Log what was done to address it.')}
                            </p>
                        </div>
                    </div>
                )}

                {/* Existing corrective actions */}
                {actions.map((ca) => (
                    <div key={ca.id} className="space-y-2 rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">{ca.taken_by_user?.name}</span>
                                <span>·</span>
                                <span>{formatTimeAgo(ca.taken_at)}</span>
                            </div>
                            <Badge variant={ca.status === 'verified' ? 'success' : 'warning'} className="text-xs">
                                {ca.status === 'verified' ? t('Verified') + ' ✓' : t('Pending verification')}
                            </Badge>
                        </div>

                        <p className="text-sm leading-relaxed">{ca.action_taken}</p>

                        {ca.notes && (
                            <p className="text-xs text-muted-foreground italic">{ca.notes}</p>
                        )}

                        {ca.status === 'verified' && ca.verified_by_user && (
                            <p className="text-xs text-muted-foreground">
                                {t('Verified by')} {ca.verified_by_user.name} · {formatTimeAgo(ca.verified_at!)}
                            </p>
                        )}

                        {/* Verify button: only for logged actions, different user, with permission */}
                        {ca.status === 'logged' && ca.taken_by !== currentUserId && (
                            <Can permission="verify corrective actions">
                                <Button size="sm" variant="outline" onClick={() => verifyAction(ca)} className="mt-1">
                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                    {t('Verify')}
                                </Button>
                            </Can>
                        )}
                    </div>
                ))}

                {/* Log corrective action form */}
                <Can permission="log corrective actions">
                    {showForm ? (
                        <form onSubmit={submitAction} className="space-y-3 rounded-lg border border-dashed p-4">
                            <div>
                                <Textarea
                                    value={caForm.data.action_taken}
                                    onChange={(e) => caForm.setData('action_taken', e.target.value)}
                                    placeholder={t('Describe what was done to address this excursion...')}
                                    rows={3}
                                    className="resize-none"
                                />
                                <InputError message={caForm.errors.action_taken} className="mt-1" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Button type="submit" size="sm" disabled={caForm.processing}>
                                    {caForm.processing ? t('Saving...') : t('Submit')}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        setShowForm(false);
                                        caForm.reset();
                                        caForm.clearErrors();
                                    }}
                                >
                                    {t('Cancel')}
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            {t('Log Corrective Action')}
                        </Button>
                    )}
                </Can>
            </CardContent>
        </Card>
    );
}

function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}
