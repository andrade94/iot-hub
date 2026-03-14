# Notifications

This template includes a complete notification system with database storage, real-time updates, and beautiful UI components powered by Laravel Notifications and shadcn/ui.

## Features

- ✅ Database notifications
- ✅ Notification bell with unread count badge
- ✅ Dropdown preview of recent notifications
- ✅ Full notifications page with filtering
- ✅ Mark as read/unread functionality
- ✅ Delete notifications
- ✅ Group notifications by date
- ✅ Multiple notification types (success, error, warning, info)
- ✅ Custom icons per notification
- ✅ Action buttons with URLs
- ✅ Beautiful shadcn/Tailwind styling
- ✅ Dark mode support
- ✅ Internationalization support

---

## Quick Start

### Sending a Notification

```php
use App\Notifications\WelcomeNotification;

$user->notify(new WelcomeNotification());
```

### Displaying Notifications

```tsx
import { NotificationDropdown } from '@/components/ui/notification-dropdown';

export function Header() {
    const { auth } = usePage().props;

    return (
        <header>
            <NotificationDropdown notifications={auth.user.notifications} />
        </header>
    );
}
```

That's it! You have a fully functional notification system.

---

## Components

### NotificationBell

Notification bell icon with animated badge showing unread count.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `count` | `number` | - | Number of unread notifications |
| `onClick` | `() => void` | - | Click handler |
| `showBadge` | `boolean` | `true` | Show unread count badge |
| `className` | `string` | - | Custom className |

**Example:**

```tsx
<NotificationBell
    count={5}
    onClick={() => router.visit('/notifications')}
/>
```

### NotificationDropdown

Dropdown menu showing recent notifications with quick actions.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `notifications` | `DatabaseNotification[]` | - | Array of notifications |
| `maxDisplay` | `number` | `5` | Maximum notifications to show |
| `className` | `string` | - | Custom className |

**Example:**

```tsx
<NotificationDropdown
    notifications={notifications}
    maxDisplay={10}
/>
```

### NotificationItem

Display a single notification with action buttons.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `notification` | `DatabaseNotification` | - | Notification object |
| `onMarkAsRead` | `(id: string) => void` | - | Mark as read callback |
| `onDelete` | `(id: string) => void` | - | Delete callback |
| `showActions` | `boolean` | `true` | Show action buttons |
| `className` | `string` | - | Custom className |

**Example:**

```tsx
<NotificationItem
    notification={notification}
    onMarkAsRead={handleMarkAsRead}
    onDelete={handleDelete}
/>
```

---

## Hook: useNotifications

Custom hook for managing notifications.

```tsx
import { useNotifications } from '@/hooks/use-notifications';

function MyComponent() {
    const {
        isLoading,           // Boolean: currently loading
        markAsRead,          // Mark single notification as read
        markAllAsRead,       // Mark all as read
        deleteNotification,  // Delete single notification
        deleteReadNotifications, // Delete all read notifications
        getUnreadCount,      // Get unread count
        filterNotifications, // Filter by read status
    } = useNotifications({
        onSuccess: (message) => console.log(message),
        onError: (error) => console.error(error),
    });

    return (
        <button onClick={() => markAsRead(notification.id)}>
            Mark as read
        </button>
    );
}
```

---

## Utility Functions

The `notification.ts` utility provides helpful functions:

```tsx
import {
    formatNotificationTime,
    getNotificationTypeColor,
    getNotificationTypeBgColor,
    getNotificationTypeBorderColor,
    getNotificationIcon,
    isUnread,
    groupNotificationsByDate,
    filterNotificationsByType,
    sortNotificationsByDate,
    getNotificationTitle,
    getNotificationMessage,
    getNotificationActionUrl,
    getNotificationActionText,
    getNotificationType,
    formatNotificationCount,
    getUnreadCount,
} from '@/utils/notification';

// Format timestamp
formatNotificationTime(notification.created_at); // "2 hours ago"

// Check if unread
isUnread(notification); // true/false

// Get type color
getNotificationTypeColor('success'); // "text-green-600 dark:text-green-400"

// Format count for badge
formatNotificationCount(99); // "99"
formatNotificationCount(150); // "99+"

// Group by date
const groups = groupNotificationsByDate(notifications);
// Returns: { "Today": [...], "Yesterday": [...], "This Week": [...] }

// Get unread count
const count = getUnreadCount(notifications); // 5
```

---

## Creating Custom Notifications

### Basic Notification

```php
<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class CustomNotification extends Notification
{
    use Queueable;

    public function __construct(
        private string $title,
        private string $message,
    ) {
        //
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'message' => $this->message,
            'type' => 'info',
            'icon' => 'Bell',
        ];
    }
}
```

### Notification with Action

```php
public function toArray(object $notifiable): array
{
    return [
        'title' => 'New Comment',
        'message' => 'Someone commented on your post',
        'type' => 'info',
        'icon' => 'MessageSquare',
        'action_url' => '/posts/' . $this->post->id,
        'action_text' => 'View Post',
    ];
}
```

### System Notification (Reusable)

Use the provided `SystemNotification` class:

```php
use App\Notifications\SystemNotification;

$user->notify(new SystemNotification(
    title: 'Account Updated',
    message: 'Your profile has been successfully updated.',
    type: 'success',
    actionUrl: '/settings/profile',
    actionText: 'View Profile'
));
```

### Activity Notification

Use the provided `ActivityNotification` class:

```php
use App\Notifications\ActivityNotification;

$user->notify(new ActivityNotification(
    activityType: 'comment',
    description: 'John Doe commented on your post',
    resourceUrl: '/posts/123'
));
```

---

## Backend API

### Get All Notifications

**GET** `/notifications`

Query parameters:
- `filter` - Filter by status: `all`, `unread`, `read`
- `per_page` - Number per page (default: 20)

```tsx
router.get('/notifications', { filter: 'unread', per_page: 50 });
```

### Get Unread Count

**GET** `/notifications/unread-count`

```tsx
const response = await fetch('/notifications/unread-count');
const { count } = await response.json();
```

### Mark as Read

**POST** `/notifications/{id}/mark-as-read`

```tsx
await fetch(`/notifications/${id}/mark-as-read`, {
    method: 'POST',
    headers: {
        'X-CSRF-TOKEN': csrfToken,
    },
});
```

### Mark All as Read

**POST** `/notifications/mark-all-as-read`

```tsx
await fetch('/notifications/mark-all-as-read', {
    method: 'POST',
    headers: {
        'X-CSRF-TOKEN': csrfToken,
    },
});
```

### Delete Notification

**DELETE** `/notifications/{id}`

```tsx
router.delete(`/notifications/${id}`);
```

### Delete All Read

**DELETE** `/notifications/read/delete-all`

```tsx
router.delete('/notifications/read/delete-all');
```

---

## Notification Data Structure

Notifications are stored in the `notifications` table:

```typescript
interface DatabaseNotification {
    id: string;                    // UUID
    type: string;                  // Notification class name
    notifiable_type: string;       // User model
    notifiable_id: number;         // User ID
    data: NotificationData;        // Notification payload
    read_at: string | null;        // When marked as read
    created_at: string;
    updated_at: string;
}

interface NotificationData {
    title: string;                 // Notification title
    message: string;               // Notification message
    type: 'success' | 'error' | 'warning' | 'info';
    icon?: string;                 // Lucide icon name
    action_url?: string;           // Optional action URL
    action_text?: string;          // Optional action text
    [key: string]: any;            // Additional custom data
}
```

---

## Notification Types

The system supports 4 notification types, each with distinct colors:

| Type | Color | Use Case |
|------|-------|----------|
| `success` | Green | Successful operations, achievements |
| `error` | Red | Errors, failures, critical issues |
| `warning` | Yellow | Warnings, important notices |
| `info` | Blue | General information, updates |

---

## Icons

Use any [Lucide icon](https://lucide.dev/) name in the `icon` field:

```php
'icon' => 'CheckCircle',  // Success icon
'icon' => 'XCircle',      // Error icon
'icon' => 'AlertTriangle', // Warning icon
'icon' => 'Info',         // Info icon
'icon' => 'Bell',         // Default bell
'icon' => 'MessageSquare', // Comment
'icon' => 'Heart',        // Like
'icon' => 'UserPlus',     // New follower
// ... any Lucide icon
```

---

## Examples

### Welcome Notification on Registration

```php
// In RegisteredUserController or RegisterResponse

use App\Notifications\WelcomeNotification;

$user->notify(new WelcomeNotification());
```

### New Comment Notification

```php
use App\Notifications\ActivityNotification;

// When a comment is created
$post->user->notify(new ActivityNotification(
    activityType: 'comment',
    description: "{$commenter->name} commented on your post: {$post->title}",
    resourceUrl: "/posts/{$post->id}#comment-{$comment->id}"
));
```

### System Maintenance Alert

```php
use App\Notifications\SystemNotification;

User::all()->each(function ($user) {
    $user->notify(new SystemNotification(
        title: 'Scheduled Maintenance',
        message: 'The system will be down for maintenance on Sunday at 2 AM UTC.',
        type: 'warning',
        actionUrl: '/status',
        actionText: 'View Status Page'
    ));
});
```

### Content Published

```php
use App\Notifications\ActivityNotification;

$author->notify(new ActivityNotification(
    activityType: 'published',
    description: "Your article '{$article->title}' has been published!",
    resourceUrl: "/articles/{$article->slug}"
));
```

---

## Sending to Multiple Users

### All Users

```php
use App\Models\User;
use Illuminate\Support\Facades\Notification;

Notification::send(
    User::all(),
    new SystemNotification('Update', 'New features available!')
);
```

### Specific Role

```php
Notification::send(
    User::role('admin')->get(),
    new SystemNotification('Admin Alert', 'Review pending items')
);
```

### Queued Notifications

For better performance with many users:

```php
// In your notification class
use Illuminate\Contracts\Queue\ShouldQueue;

class MyNotification extends Notification implements ShouldQueue
{
    use Queueable;
    // ...
}
```

---

## Frontend Integration

### Add to App Layout

```tsx
// In app-layout.tsx or header component

import { NotificationDropdown } from '@/components/ui/notification-dropdown';
import { usePage } from '@inertiajs/react';

export function AppLayout({ children }) {
    const { auth } = usePage().props;

    return (
        <div>
            <header>
                <NotificationDropdown
                    notifications={auth.user.notifications}
                    maxDisplay={5}
                />
            </header>
            {children}
        </div>
    );
}
```

### Share Notifications with Inertia

```php
// In HandleInertiaRequests middleware

public function share(Request $request): array
{
    return [
        ...parent::share($request),
        'auth' => [
            'user' => $request->user() ? [
                ...$request->user()->toArray(),
                'notifications' => $request->user()
                    ->notifications()
                    ->latest()
                    ->limit(10)
                    ->get(),
                'unread_notifications_count' => $request->user()
                    ->unreadNotifications()
                    ->count(),
            ] : null,
        ],
    ];
}
```

---

## Styling

All components use shadcn/ui and Tailwind CSS. Customize by:

### Theme Colors

Notification types respect your theme colors:
- Success: `bg-green-100 dark:bg-green-900/20`
- Error: `bg-red-100 dark:bg-red-900/20`
- Warning: `bg-yellow-100 dark:bg-yellow-900/20`
- Info: `bg-blue-100 dark:bg-blue-900/20`

### Custom Styling

```tsx
<NotificationItem
    notification={notification}
    className="border-2 shadow-lg"
/>
```

### Dark Mode

Components automatically adapt to dark mode via Tailwind's `dark:` variants.

---

## Grouping Notifications

The system automatically groups notifications by date:

```tsx
import { groupNotificationsByDate } from '@/utils/notification';

const groups = groupNotificationsByDate(notifications);
// {
//   "Today": [...],
//   "Yesterday": [...],
//   "This Week": [...],
//   "This Month": [...],
//   "Older": [...]
// }

Object.entries(groups).map(([group, notifications]) => (
    <div key={group}>
        <h3>{group}</h3>
        {notifications.map(notification => ...)}
    </div>
));
```

---

## Real-time Updates (Optional)

For real-time notifications, integrate with Laravel Echo + Pusher:

```tsx
// In your layout or notification component

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

const echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
});

echo.private(`App.Models.User.${userId}`)
    .notification((notification) => {
        // Handle new notification
        console.log('New notification:', notification);
        // Reload notifications
        router.reload({ only: ['auth'] });
    });
```

---

## Testing

### Send Test Notification

```php
// In Tinker or a seeder

use App\Models\User;
use App\Notifications\SystemNotification;

$user = User::first();

$user->notify(new SystemNotification(
    'Test Notification',
    'This is a test message',
    'info'
));
```

### Create Demo Seeder

```php
<?php

namespace Database\Seeders;

use App\Models\User;
use App\Notifications\SystemNotification;
use App\Notifications\ActivityNotification;
use App\Notifications\WelcomeNotification;
use Illuminate\Database\Seeder;

class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();

        // Welcome notification
        $user->notify(new WelcomeNotification());

        // System notifications
        $user->notify(new SystemNotification(
            'Account Verified',
            'Your account has been successfully verified.',
            'success'
        ));

        $user->notify(new SystemNotification(
            'Security Alert',
            'New login from unknown device detected.',
            'warning',
            '/settings/security',
            'Review Activity'
        ));

        // Activity notifications
        $user->notify(new ActivityNotification(
            'comment',
            'John Doe commented on your post',
            '/posts/123'
        ));

        $user->notify(new ActivityNotification(
            'mention',
            'You were mentioned in a discussion',
            '/discussions/456'
        ));
    }
}
```

Run the seeder:

```bash
php artisan db:seed --class=NotificationSeeder
```

---

## Troubleshooting

### Notifications not appearing

1. Check notifications table exists:
```bash
php artisan migrate:status
```

2. Verify notification was sent:
```php
use Illuminate\Support\Facades\DB;

DB::table('notifications')->latest()->first();
```

3. Check Inertia shares notifications:
```tsx
console.log(usePage().props.auth.user.notifications);
```

### Badge count not updating

Make sure you're sharing unread count in `HandleInertiaRequests`:

```php
'unread_notifications_count' => $request->user()
    ->unreadNotifications()
    ->count(),
```

### Icons not showing

Verify you're using valid [Lucide icon names](https://lucide.dev/):

```php
'icon' => 'Bell', // ✅ Valid
'icon' => 'bell', // ❌ Invalid (lowercase)
```

---

## Resources

- [Laravel Notifications](https://laravel.com/docs/notifications)
- [Lucide Icons](https://lucide.dev/)
- [shadcn/ui](https://ui.shadcn.com/)

---

**Last Updated:** 2025-10-22
