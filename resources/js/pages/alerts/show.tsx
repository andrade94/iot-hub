import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { Alert, AlertNotificationRecord, BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Bell,
    CheckCircle2,
    Clock,
    Cpu,
    Eye,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    ShieldAlert,
    XCircle,
} from 'lucide-react';

interface Props {
    alert: Alert & {
        notifications?: AlertNotificationRecord[];
    };
}

export default function AlertShow({ alert }: Props) {
    const { t } = useLang();
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
                    </div>

                    {/* Actions */}
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
                    </div>
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
