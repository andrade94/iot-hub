<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Collection;

class NotificationDigestMail extends BaseMailable
{
    /**
     * Create a new message instance.
     */
    public function __construct(
        public User $user,
        public Collection $notifications,
        public string $period = 'daily'
    ) {
        parent::__construct();
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(
                config('mail.from.address'),
                config('mail.from.name')
            ),
            to: [new Address($this->user->email, $this->user->name)],
            subject: $this->getSubject(),
        );
    }

    /**
     * Get the subject of the email.
     */
    protected function getSubject(): string
    {
        $count = $this->notifications->count();
        $periodLabel = $this->period === 'weekly' ? 'Weekly' : 'Daily';

        return "[{$periodLabel} Digest] You have {$count} unread notification".($count !== 1 ? 's' : '');
    }

    /**
     * Get the view for the email.
     */
    protected function getView(): string
    {
        return 'emails.notification-digest';
    }

    /**
     * Get the data for the view.
     */
    protected function getViewData(): array
    {
        return array_merge(parent::getViewData(), [
            'user' => $this->user,
            'notifications' => $this->notifications,
            'period' => $this->period,
            'notificationsUrl' => config('app.url').'/notifications',
        ]);
    }
}
