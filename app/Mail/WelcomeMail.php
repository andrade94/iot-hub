<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Envelope;

class WelcomeMail extends BaseMailable
{
    /**
     * Create a new message instance.
     */
    public function __construct(
        public User $user
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
        return 'Welcome to '.config('app.name');
    }

    /**
     * Get the view for the email.
     */
    protected function getView(): string
    {
        return 'emails.welcome';
    }

    /**
     * Get the data for the view.
     */
    protected function getViewData(): array
    {
        return array_merge(parent::getViewData(), [
            'user' => $this->user,
            'dashboardUrl' => config('app.url').'/dashboard',
        ]);
    }
}
