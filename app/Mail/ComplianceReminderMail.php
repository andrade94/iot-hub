<?php

namespace App\Mail;

use App\Models\ComplianceEvent;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Envelope;

class ComplianceReminderMail extends BaseMailable
{
    /**
     * Create a new message instance.
     */
    public function __construct(
        public ComplianceEvent $event,
        public int $daysUntilDue,
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
            subject: $this->getSubject(),
        );
    }

    /**
     * Get the subject of the email.
     */
    protected function getSubject(): string
    {
        $days = $this->daysUntilDue;

        return "Reminder: {$this->event->title} due in {$days} day".($days !== 1 ? 's' : '');
    }

    /**
     * Get the view for the email.
     */
    protected function getView(): string
    {
        return 'emails.compliance-reminder';
    }

    /**
     * Get the data for the view.
     */
    protected function getViewData(): array
    {
        return array_merge(parent::getViewData(), [
            'event' => $this->event,
            'daysUntilDue' => $this->daysUntilDue,
            'siteName' => $this->event->site->name ?? 'Unknown Site',
            'calendarUrl' => config('app.url').'/settings/compliance',
        ]);
    }
}
