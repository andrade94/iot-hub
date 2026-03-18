<?php

namespace App\Mail;

class MorningSummaryMail extends BaseMailable
{
    /**
     * Create a new message instance.
     */
    public function __construct(
        public string $siteName,
        public array $summary,
    ) {
        parent::__construct();
    }

    /**
     * Get the subject of the email.
     */
    protected function getSubject(): string
    {
        return "Morning Summary — {$this->siteName}";
    }

    /**
     * Get the view for the email.
     */
    protected function getView(): string
    {
        return 'emails.morning-summary';
    }

    /**
     * Get the data for the view.
     */
    protected function getViewData(): array
    {
        return array_merge(parent::getViewData(), [
            'siteName' => $this->siteName,
            'summary' => $this->summary,
        ]);
    }
}
