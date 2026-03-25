/**
 * Notifications Page
 *
 * Industrial Precision design treatment — bg-dots header, section dividers,
 * shadow-elevation-1, FadeIn, font-mono on counts/pagination.
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationItem } from '@/components/ui/notification-item';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useNotifications } from '@/hooks/use-notifications';
import { useToast } from '@/hooks/use-toast';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, DatabaseNotification } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Bell, CheckCheck, Filter, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { getUnreadCount, groupNotificationsByDate } from '@/utils/notification';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Notifications',
        href: '/notifications',
    },
];

interface NotificationsPageProps {
    notifications: {
        data: DatabaseNotification[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filter?: 'all' | 'unread' | 'read';
}

export function NotificationsSkeleton() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="rounded-xl border p-6 md:p-8">
                <div className="flex items-start justify-between">
                    <div>
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="mt-3 h-8 w-40" />
                        <Skeleton className="mt-2 h-4 w-48" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-32" />
                        <Skeleton className="h-9 w-28" />
                    </div>
                </div>
            </div>
            {/* Filter */}
            <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-12" />
                <div className="h-px flex-1 bg-border" />
            </div>
            <div className="rounded-xl border p-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-9 w-[180px]" />
                </div>
            </div>
            {/* Notification items */}
            <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border p-4">
                        <div className="flex items-start gap-3">
                            <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-full max-w-sm" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                            <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function NotificationsPage({ notifications, filter = 'all' }: NotificationsPageProps) {
    const { t } = useLang();
    const { toast } = useToast();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const unreadCount = getUnreadCount(notifications.data);

    const { markAsRead, markAllAsRead, deleteNotification, deleteReadNotifications } = useNotifications({
        onSuccess: (message) => {
            if (message) {
                toast({
                    title: t('Success'),
                    description: message,
                });
            }
        },
        onError: (error) => {
            toast({
                title: t('Error'),
                description: error,
                variant: 'destructive',
            });
        },
    });

    const handleFilterChange = (value: string) => {
        router.get('/notifications', { filter: value }, { preserveState: true, preserveScroll: true });
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
    };

    const handleDeleteRead = () => {
        setShowDeleteConfirm(true);
    };

    // Group notifications by date
    const groupedNotifications = groupNotificationsByDate(notifications.data);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Notifications')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* ── Header ──────────────────────────────────────── */}
                <FadeIn direction="down" duration={400}>
                    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-elevation-1">
                        <div className="bg-dots absolute inset-0 opacity-30 dark:opacity-20" />
                        <div className="relative flex items-start justify-between p-6 md:p-8">
                            <div>
                                <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                    {t('Notifications')}
                                </p>
                                <h1 className="font-display mt-1.5 text-[1.5rem] font-bold tracking-tight md:text-[2.25rem]">
                                    {t('Notifications')}
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    <span className="font-mono tabular-nums">{notifications.total}</span> {t('total notifications')}
                                    {unreadCount > 0 && (
                                        <>
                                            {' '}&middot;{' '}
                                            <span className="font-mono tabular-nums">{unreadCount}</span> {t('unread')}
                                        </>
                                    )}
                                </p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <Button onClick={handleMarkAllAsRead} variant="outline" size="sm">
                                        <CheckCheck className="mr-2 h-4 w-4" />
                                        {t('Mark all read')}
                                    </Button>
                                )}

                                {notifications.data.some((n) => n.read_at !== null) && (
                                    <Button onClick={handleDeleteRead} variant="outline" size="sm">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {t('Delete read')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </FadeIn>

                {/* ── FILTER ──────────────────────────────────────── */}
                <FadeIn delay={75} duration={400}>
                    <div className="flex items-center gap-3">
                        <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                            {t('Filter')}
                        </h2>
                        <div className="h-px flex-1 bg-border" />
                    </div>
                </FadeIn>

                <FadeIn delay={100} duration={400}>
                    <Card className="shadow-elevation-1">
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Filter className="h-4 w-4" />
                                    <span>{t('Show:')}</span>
                                </div>

                                <Select value={filter} onValueChange={handleFilterChange}>
                                    <SelectTrigger className="w-[180px] bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Notifications')}</SelectItem>
                                        <SelectItem value="unread">{t('Unread Only')}</SelectItem>
                                        <SelectItem value="read">{t('Read Only')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </Card>
                </FadeIn>

                {/* ── Notifications List ───────────────────────────── */}
                {notifications.data.length === 0 ? (
                    <FadeIn delay={150} duration={400}>
                        <Card className="shadow-elevation-1">
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="relative mb-6">
                                    <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted/30">
                                        <Bell className="h-8 w-8 text-muted-foreground/50" />
                                    </div>
                                </div>
                                <h3 className="font-display text-xl font-semibold tracking-tight mb-2">
                                    {t('All Clear')}
                                </h3>
                                <p className="text-muted-foreground max-w-sm">
                                    {filter === 'unread'
                                        ? t('No unread notifications')
                                        : filter === 'read'
                                          ? t('No read notifications')
                                          : t('No notifications')}
                                </p>
                            </div>
                        </Card>
                    </FadeIn>
                ) : (
                    <FadeIn delay={150} duration={400}>
                        <div className="space-y-6">
                            {Object.entries(groupedNotifications).map(([group, groupNotifications], groupIdx) => (
                                <FadeIn key={group} delay={175 + groupIdx * 50} duration={400}>
                                    <div className="space-y-3">
                                        {/* Group section divider */}
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">
                                                {t(group)}
                                            </h2>
                                            <div className="h-px flex-1 bg-border" />
                                            <span className="font-mono text-xs tabular-nums text-muted-foreground">
                                                {groupNotifications.length}
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {groupNotifications.map((notification) => (
                                                <NotificationItem
                                                    key={notification.id}
                                                    notification={notification}
                                                    onMarkAsRead={markAsRead}
                                                    onDelete={deleteNotification}
                                                    showActions={true}
                                                    className="shadow-elevation-1"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </FadeIn>
                            ))}
                        </div>
                    </FadeIn>
                )}

                {/* ── Pagination ───────────────────────────────────── */}
                {notifications.last_page > 1 && (
                    <FadeIn delay={250} duration={400}>
                        <div className="flex items-center justify-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() =>
                                    router.get(
                                        '/notifications',
                                        { filter, page: notifications.current_page - 1 },
                                        { preserveState: true },
                                    )
                                }
                                disabled={notifications.current_page === 1}
                            >
                                {t('Previous')}
                            </Button>

                            <span className="text-sm text-muted-foreground">
                                {t('Page')}{' '}
                                <span className="font-mono tabular-nums font-medium text-foreground">
                                    {notifications.current_page}
                                </span>{' '}
                                {t('of')}{' '}
                                <span className="font-mono tabular-nums font-medium text-foreground">
                                    {notifications.last_page}
                                </span>
                            </span>

                            <Button
                                variant="outline"
                                onClick={() =>
                                    router.get(
                                        '/notifications',
                                        { filter, page: notifications.current_page + 1 },
                                        { preserveState: true },
                                    )
                                }
                                disabled={notifications.current_page === notifications.last_page}
                            >
                                {t('Next')}
                            </Button>
                        </div>
                    </FadeIn>
                )}

                <ConfirmationDialog
                    open={showDeleteConfirm}
                    onOpenChange={setShowDeleteConfirm}
                    title={t('Delete Read Notifications')}
                    description={t('Are you sure you want to delete all read notifications?')}
                    warningMessage={t('This action cannot be undone.')}
                    onConfirm={() => {
                        deleteReadNotifications();
                        setShowDeleteConfirm(false);
                    }}
                    actionLabel={t('Delete')}
                />
            </div>
        </AppLayout>
    );
}
