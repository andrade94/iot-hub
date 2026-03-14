/**
 * Notifications Page
 *
 * Full page view of user notifications with filtering and actions
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NotificationItem } from '@/components/ui/notification-item';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/use-notifications';
import { useToast } from '@/hooks/use-toast';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, DatabaseNotification } from '@/types';
import { Head, router } from '@inertiajs/react';
import { CheckCheck, Trash2 } from 'lucide-react';
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

export default function NotificationsPage({ notifications, filter = 'all' }: NotificationsPageProps) {
    const { t } = useLang();
    const { toast } = useToast();
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
        if (confirm(t('Are you sure you want to delete all read notifications?'))) {
            deleteReadNotifications();
        }
    };

    // Group notifications by date
    const groupedNotifications = groupNotificationsByDate(notifications.data);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Notifications')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                {/* Page Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">{t('Notifications')}</h1>
                        <p className="mt-2 text-muted-foreground">
                            {notifications.total} {t('total notifications')}
                            {unreadCount > 0 && ` • ${unreadCount} ${t('unread')}`}
                        </p>
                    </div>

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

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>{t('Filter Notifications')}</CardTitle>
                                <CardDescription>
                                    {t('Show all, unread, or read notifications')}
                                </CardDescription>
                            </div>

                            <Select value={filter} onValueChange={handleFilterChange}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Notifications')}</SelectItem>
                                    <SelectItem value="unread">{t('Unread Only')}</SelectItem>
                                    <SelectItem value="read">{t('Read Only')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                </Card>

                {/* Notifications List */}
                {notifications.data.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-muted-foreground">
                                {filter === 'unread'
                                    ? t('No unread notifications')
                                    : filter === 'read'
                                      ? t('No read notifications')
                                      : t('No notifications')}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedNotifications).map(([group, groupNotifications]) => (
                            <div key={group} className="space-y-3">
                                <h2 className="text-sm font-semibold text-muted-foreground">{t(group)}</h2>
                                <div className="space-y-2">
                                    {groupNotifications.map((notification) => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            onMarkAsRead={markAsRead}
                                            onDelete={deleteNotification}
                                            showActions={true}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {notifications.last_page > 1 && (
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
                            {t('Page')} {notifications.current_page} {t('of')} {notifications.last_page}
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
                )}
            </div>
        </AppLayout>
    );
}
