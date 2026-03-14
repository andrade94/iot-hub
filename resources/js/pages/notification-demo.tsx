/**
 * Notification Demo Page
 *
 * Interactive demonstration of the notification system with live examples
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/ui/notification-bell';
import { NotificationDropdown } from '@/components/ui/notification-dropdown';
import { NotificationItem } from '@/components/ui/notification-item';
import { useToast } from '@/hooks/use-toast';
import { useLang } from '@/hooks/use-lang';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, DatabaseNotification } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    Bell,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Info,
    MessageSquare,
    AtSign,
    Plus,
    Send,
    Pencil,
    Sparkles,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Notification Demo',
        href: '/notification-demo',
    },
];

interface NotificationDemoProps {
    sampleNotifications: DatabaseNotification[];
}

export default function NotificationDemo({ sampleNotifications = [] }: NotificationDemoProps) {
    const { t } = useLang();
    const { toast } = useToast();
    const { auth } = usePage<any>().props;
    const [isSending, setIsSending] = useState(false);

    const sendTestNotification = async (type: string) => {
        setIsSending(true);

        try {
            const response = await fetch('/api/notifications/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute('content') as string,
                },
                body: JSON.stringify({ type }),
            });

            if (!response.ok) {
                throw new Error('Failed to send notification');
            }

            toast({
                title: 'Notification Sent',
                description: `A ${type} notification has been sent to your account.`,
            });

            // Reload to show new notification
            router.reload({ only: ['auth'] });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to send test notification',
                variant: 'destructive',
            });
        } finally {
            setIsSending(false);
        }
    };

    // Create sample notifications for preview
    const sampleNotificationData: DatabaseNotification[] = [
        {
            id: 'demo-1',
            type: 'App\\Notifications\\WelcomeNotification',
            notifiable_type: 'App\\Models\\User',
            notifiable_id: 1,
            data: {
                title: 'Welcome!',
                message: 'Thank you for joining us. Explore the features.',
                type: 'success',
                icon: 'Sparkles',
                action_url: '/dashboard',
                action_text: 'Get Started',
            },
            read_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            id: 'demo-2',
            type: 'App\\Notifications\\SystemNotification',
            notifiable_type: 'App\\Models\\User',
            notifiable_id: 1,
            data: {
                title: 'Payment Failed',
                message: 'Your payment could not be processed.',
                type: 'error',
                icon: 'XCircle',
                action_url: '/settings/billing',
                action_text: 'Update Payment',
            },
            read_at: null,
            created_at: new Date(Date.now() - 3600000).toISOString(),
            updated_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
            id: 'demo-3',
            type: 'App\\Notifications\\SystemNotification',
            notifiable_type: 'App\\Models\\User',
            notifiable_id: 1,
            data: {
                title: 'Scheduled Maintenance',
                message: 'System maintenance on Sunday at 2 AM UTC.',
                type: 'warning',
                icon: 'AlertTriangle',
                action_url: '/status',
                action_text: 'View Status',
            },
            read_at: new Date().toISOString(),
            created_at: new Date(Date.now() - 7200000).toISOString(),
            updated_at: new Date(Date.now() - 7200000).toISOString(),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Notification Demo')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                {/* Page Header */}
                <div>
                    <h1 className="text-3xl font-bold">{t('Notification System Demo')}</h1>
                    <p className="mt-2 text-muted-foreground">
                        Test and preview the notification system with interactive examples
                    </p>
                </div>

                {/* Component Previews */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Notification Bell */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Notification Bell</CardTitle>
                            <CardDescription>
                                Bell icon with animated badge showing unread count
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-around rounded-lg border p-8">
                                <div className="text-center">
                                    <NotificationBell count={0} />
                                    <p className="mt-2 text-xs text-muted-foreground">No notifications</p>
                                </div>
                                <div className="text-center">
                                    <NotificationBell count={3} />
                                    <p className="mt-2 text-xs text-muted-foreground">3 notifications</p>
                                </div>
                                <div className="text-center">
                                    <NotificationBell count={99} />
                                    <p className="mt-2 text-xs text-muted-foreground">99 notifications</p>
                                </div>
                                <div className="text-center">
                                    <NotificationBell count={150} />
                                    <p className="mt-2 text-xs text-muted-foreground">99+ notifications</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notification Dropdown */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Notification Dropdown</CardTitle>
                            <CardDescription>
                                Dropdown menu with recent notifications and quick actions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-center rounded-lg border p-8">
                                <NotificationDropdown
                                    notifications={auth?.user?.notifications || sampleNotificationData}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Notification Types */}
                <Card>
                    <CardHeader>
                        <CardTitle>Notification Types</CardTitle>
                        <CardDescription>
                            Preview of all notification types with their distinct styling
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {sampleNotificationData.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                showActions={false}
                            />
                        ))}
                    </CardContent>
                </Card>

                {/* Send Test Notifications */}
                <Card>
                    <CardHeader>
                        <CardTitle>Send Test Notifications</CardTitle>
                        <CardDescription>
                            Click buttons below to send test notifications to your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <Button
                                onClick={() => sendTestNotification('success')}
                                disabled={isSending}
                                variant="outline"
                                className="justify-start"
                            >
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                Success Notification
                            </Button>

                            <Button
                                onClick={() => sendTestNotification('error')}
                                disabled={isSending}
                                variant="outline"
                                className="justify-start"
                            >
                                <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                Error Notification
                            </Button>

                            <Button
                                onClick={() => sendTestNotification('warning')}
                                disabled={isSending}
                                variant="outline"
                                className="justify-start"
                            >
                                <AlertTriangle className="mr-2 h-4 w-4 text-yellow-600" />
                                Warning Notification
                            </Button>

                            <Button
                                onClick={() => sendTestNotification('info')}
                                disabled={isSending}
                                variant="outline"
                                className="justify-start"
                            >
                                <Info className="mr-2 h-4 w-4 text-blue-600" />
                                Info Notification
                            </Button>

                            <Button
                                onClick={() => sendTestNotification('comment')}
                                disabled={isSending}
                                variant="outline"
                                className="justify-start"
                            >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Comment Activity
                            </Button>

                            <Button
                                onClick={() => sendTestNotification('mention')}
                                disabled={isSending}
                                variant="outline"
                                className="justify-start"
                            >
                                <AtSign className="mr-2 h-4 w-4" />
                                Mention Activity
                            </Button>

                            <Button
                                onClick={() => sendTestNotification('created')}
                                disabled={isSending}
                                variant="outline"
                                className="justify-start"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Created Activity
                            </Button>

                            <Button
                                onClick={() => sendTestNotification('published')}
                                disabled={isSending}
                                variant="outline"
                                className="justify-start"
                            >
                                <Send className="mr-2 h-4 w-4" />
                                Published Activity
                            </Button>

                            <Button
                                onClick={() => sendTestNotification('updated')}
                                disabled={isSending}
                                variant="outline"
                                className="justify-start"
                            >
                                <Pencil className="mr-2 h-4 w-4" />
                                Updated Activity
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* CLI Commands */}
                <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20">
                    <CardHeader>
                        <CardTitle className="text-blue-900 dark:text-blue-100">
                            Alternative Testing Methods
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
                        <div>
                            <p className="font-semibold">1. Database Seeder (Bulk Test Data)</p>
                            <code className="mt-1 block rounded bg-blue-100 p-2 dark:bg-blue-900/40">
                                php artisan db:seed --class=NotificationSeeder
                            </code>
                            <p className="mt-1 text-xs">
                                Creates 13 test notifications with a mix of read/unread status
                            </p>
                        </div>

                        <div>
                            <p className="font-semibold">2. Artisan Command (Interactive)</p>
                            <code className="mt-1 block rounded bg-blue-100 p-2 dark:bg-blue-900/40">
                                php artisan notification:test
                            </code>
                            <p className="mt-1 text-xs">
                                Interactive CLI tool to send specific notification types to any user
                            </p>
                        </div>

                        <div>
                            <p className="font-semibold">3. Artisan Command (Direct)</p>
                            <code className="mt-1 block rounded bg-blue-100 p-2 dark:bg-blue-900/40">
                                php artisan notification:test admin@example.com --type=success
                            </code>
                            <p className="mt-1 text-xs">
                                Send a specific notification type directly to a user
                            </p>
                        </div>

                        <div className="pt-2">
                            <p className="font-semibold">View Notifications:</p>
                            <Button variant="link" className="h-auto p-0 text-blue-600" asChild>
                                <a href="/notifications">Go to Notifications Page →</a>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Testing Checklist */}
                <Card>
                    <CardHeader>
                        <CardTitle>Testing Checklist</CardTitle>
                        <CardDescription>Features to test in the notification system</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <p>✅ <strong>Notification Bell:</strong> Badge shows correct unread count</p>
                        <p>✅ <strong>Notification Dropdown:</strong> Shows recent notifications with actions</p>
                        <p>✅ <strong>Mark as Read:</strong> Click checkmark to mark individual notifications</p>
                        <p>✅ <strong>Mark All Read:</strong> Bulk action to mark all notifications as read</p>
                        <p>✅ <strong>Delete:</strong> Remove individual or all read notifications</p>
                        <p>✅ <strong>Filtering:</strong> Filter by all/unread/read status</p>
                        <p>✅ <strong>Grouping:</strong> Notifications grouped by date (Today, Yesterday, etc.)</p>
                        <p>✅ <strong>Color Coding:</strong> Each type has distinct colors (green/red/yellow/blue)</p>
                        <p>✅ <strong>Icons:</strong> Custom Lucide icons display correctly</p>
                        <p>✅ <strong>Action Buttons:</strong> Navigate to correct URLs</p>
                        <p>✅ <strong>Pagination:</strong> Test with 20+ notifications</p>
                        <p>✅ <strong>Dark Mode:</strong> All components adapt to dark theme</p>
                        <p>✅ <strong>Responsive:</strong> Works on mobile/tablet/desktop</p>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
