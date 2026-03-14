<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\ActivityNotification;
use App\Notifications\SystemNotification;
use App\Notifications\WelcomeNotification;
use Illuminate\Console\Command;

use function Laravel\Prompts\select;
use function Laravel\Prompts\text;

class SendTestNotification extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'notification:test
                            {email? : The email of the user to notify}
                            {--type= : Notification type (welcome|success|error|warning|info|comment|mention)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send a test notification to a user';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        // Get user email
        $email = $this->argument('email');

        if (! $email) {
            $email = text(
                label: 'Enter user email',
                placeholder: 'admin@example.com',
                default: 'admin@example.com',
                required: true
            );
        }

        // Find user
        $user = User::where('email', $email)->first();

        if (! $user) {
            $this->error("User not found: {$email}");

            return 1;
        }

        // Get notification type
        $type = $this->option('type');

        if (! $type) {
            $type = select(
                label: 'Select notification type',
                options: [
                    'welcome' => 'Welcome Notification',
                    'success' => 'Success Message',
                    'error' => 'Error Message',
                    'warning' => 'Warning Message',
                    'info' => 'Information Message',
                    'comment' => 'Activity: Comment',
                    'mention' => 'Activity: Mention',
                    'created' => 'Activity: Created',
                    'published' => 'Activity: Published',
                    'updated' => 'Activity: Updated',
                ],
                default: 'info'
            );
        }

        // Send notification based on type
        try {
            match ($type) {
                'welcome' => $this->sendWelcome($user),
                'success' => $this->sendSuccess($user),
                'error' => $this->sendError($user),
                'warning' => $this->sendWarning($user),
                'info' => $this->sendInfo($user),
                'comment' => $this->sendComment($user),
                'mention' => $this->sendMention($user),
                'created' => $this->sendCreated($user),
                'published' => $this->sendPublished($user),
                'updated' => $this->sendUpdated($user),
                default => throw new \InvalidArgumentException("Invalid notification type: {$type}"),
            };

            $this->info("✓ Sent {$type} notification to {$user->name} ({$user->email})");
            $this->info('  View at: /notifications');

            return 0;
        } catch (\Exception $e) {
            $this->error("Failed to send notification: {$e->getMessage()}");

            return 1;
        }
    }

    protected function sendWelcome(User $user): void
    {
        $user->notify(new WelcomeNotification());
    }

    protected function sendSuccess(User $user): void
    {
        $user->notify(new SystemNotification(
            title: 'Action Completed',
            message: 'Your action has been completed successfully!',
            type: 'success',
            actionUrl: '/dashboard',
            actionText: 'View Dashboard'
        ));
    }

    protected function sendError(User $user): void
    {
        $user->notify(new SystemNotification(
            title: 'Something Went Wrong',
            message: 'An error occurred while processing your request. Please try again.',
            type: 'error',
            actionUrl: '/help',
            actionText: 'Get Help'
        ));
    }

    protected function sendWarning(User $user): void
    {
        $user->notify(new SystemNotification(
            title: 'Action Required',
            message: 'Your attention is needed. Please review the details.',
            type: 'warning',
            actionUrl: '/dashboard',
            actionText: 'Review'
        ));
    }

    protected function sendInfo(User $user): void
    {
        $user->notify(new SystemNotification(
            title: 'System Update',
            message: 'We have released a new update with improvements and bug fixes.',
            type: 'info',
            actionUrl: '/changelog',
            actionText: 'View Changelog'
        ));
    }

    protected function sendComment(User $user): void
    {
        $user->notify(new ActivityNotification(
            activityType: 'comment',
            description: 'Someone commented on your post.',
            resourceUrl: '/posts/123'
        ));
    }

    protected function sendMention(User $user): void
    {
        $user->notify(new ActivityNotification(
            activityType: 'mention',
            description: 'You were mentioned in a discussion.',
            resourceUrl: '/discussions/456'
        ));
    }

    protected function sendCreated(User $user): void
    {
        $user->notify(new ActivityNotification(
            activityType: 'created',
            description: 'A new item has been created.',
            resourceUrl: '/items/789'
        ));
    }

    protected function sendPublished(User $user): void
    {
        $user->notify(new ActivityNotification(
            activityType: 'published',
            description: 'Your content has been published!',
            resourceUrl: '/content/published'
        ));
    }

    protected function sendUpdated(User $user): void
    {
        $user->notify(new ActivityNotification(
            activityType: 'updated',
            description: 'An item has been updated.',
            resourceUrl: '/items/updated'
        ));
    }
}
