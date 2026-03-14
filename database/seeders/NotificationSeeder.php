<?php

namespace Database\Seeders;

use App\Models\User;
use App\Notifications\ActivityNotification;
use App\Notifications\SystemNotification;
use App\Notifications\WelcomeNotification;
use Illuminate\Database\Seeder;

class NotificationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * Creates test notifications for development and testing purposes.
     */
    public function run(): void
    {
        $user = User::where('email', 'admin@example.com')->first();

        if (! $user) {
            $this->command->error('Admin user not found. Run UserSeeder first.');

            return;
        }

        $this->command->info('Sending test notifications to '.$user->email.'...');

        // 1. Welcome Notification
        $user->notify(new WelcomeNotification());
        $this->command->info('  ✓ Welcome notification');

        // 2. Success Notifications
        $user->notify(new SystemNotification(
            title: 'Profile Updated',
            message: 'Your profile information has been successfully updated.',
            type: 'success',
            actionUrl: '/settings/profile',
            actionText: 'View Profile'
        ));
        $this->command->info('  ✓ Success notification (with action)');

        $user->notify(new SystemNotification(
            title: 'File Uploaded',
            message: 'Your document has been uploaded successfully.',
            type: 'success'
        ));
        $this->command->info('  ✓ Success notification (no action)');

        // 3. Error Notifications
        $user->notify(new SystemNotification(
            title: 'Payment Failed',
            message: 'Your payment could not be processed. Please update your payment method.',
            type: 'error',
            actionUrl: '/settings/billing',
            actionText: 'Update Payment'
        ));
        $this->command->info('  ✓ Error notification');

        $user->notify(new SystemNotification(
            title: 'Upload Error',
            message: 'The file you tried to upload exceeds the maximum size limit.',
            type: 'error'
        ));
        $this->command->info('  ✓ Error notification (no action)');

        // 4. Warning Notifications
        $user->notify(new SystemNotification(
            title: 'Scheduled Maintenance',
            message: 'The system will be down for maintenance on Sunday at 2 AM UTC.',
            type: 'warning',
            actionUrl: '/status',
            actionText: 'View Status'
        ));
        $this->command->info('  ✓ Warning notification');

        $user->notify(new SystemNotification(
            title: 'Storage Almost Full',
            message: 'You have used 90% of your storage quota. Consider upgrading your plan.',
            type: 'warning',
            actionUrl: '/settings/plan',
            actionText: 'Upgrade Plan'
        ));
        $this->command->info('  ✓ Warning notification (storage)');

        // 5. Info Notifications
        $user->notify(new SystemNotification(
            title: 'New Feature Available',
            message: 'Check out our new dashboard analytics feature!',
            type: 'info',
            actionUrl: '/dashboard',
            actionText: 'Explore'
        ));
        $this->command->info('  ✓ Info notification');

        // 6. Activity Notifications - Comment
        $user->notify(new ActivityNotification(
            activityType: 'comment',
            description: 'John Doe commented on your post: "Great article! Thanks for sharing."',
            resourceUrl: '/posts/123'
        ));
        $this->command->info('  ✓ Activity notification (comment)');

        // 7. Activity Notifications - Mention
        $user->notify(new ActivityNotification(
            activityType: 'mention',
            description: 'You were mentioned in a discussion by Jane Smith.',
            resourceUrl: '/discussions/456'
        ));
        $this->command->info('  ✓ Activity notification (mention)');

        // 8. Activity Notifications - Created
        $user->notify(new ActivityNotification(
            activityType: 'created',
            description: 'Your new project "Website Redesign" has been created.',
            resourceUrl: '/projects/789'
        ));
        $this->command->info('  ✓ Activity notification (created)');

        // 9. Activity Notifications - Published
        $user->notify(new ActivityNotification(
            activityType: 'published',
            description: 'Your article "Getting Started with Laravel" has been published!',
            resourceUrl: '/articles/getting-started-with-laravel'
        ));
        $this->command->info('  ✓ Activity notification (published)');

        // 10. Activity Notifications - Updated
        $user->notify(new ActivityNotification(
            activityType: 'updated',
            description: 'Your settings have been updated by an administrator.',
            resourceUrl: '/settings'
        ));
        $this->command->info('  ✓ Activity notification (updated)');

        // Mark some notifications as read (to test filtering)
        $notifications = $user->unreadNotifications->take(5);
        foreach ($notifications as $notification) {
            $notification->markAsRead();
        }

        $totalNotifications = $user->notifications()->count();
        $unreadCount = $user->unreadNotifications()->count();
        $readCount = $totalNotifications - $unreadCount;

        $this->command->info('');
        $this->command->info("✓ Created {$totalNotifications} notifications for {$user->name}");
        $this->command->info("  - {$unreadCount} unread");
        $this->command->info("  - {$readCount} read");
        $this->command->info('');
        $this->command->info('Login with: admin@example.com / password');
        $this->command->info('View at: /notifications');
    }
}
