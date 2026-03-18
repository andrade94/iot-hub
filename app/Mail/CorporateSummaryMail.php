<?php

namespace App\Mail;

class CorporateSummaryMail extends BaseMailable
{
    /**
     * Create a new message instance.
     */
    public function __construct(
        public string $orgName,
        public array $summary,
    ) {
        parent::__construct();
    }

    /**
     * Get the subject of the email.
     */
    protected function getSubject(): string
    {
        return "Corporate Summary — {$this->orgName}";
    }

    /**
     * Get the view for the email.
     */
    protected function getView(): string
    {
        return 'emails.corporate-summary';
    }

    /**
     * Get the data for the view.
     */
    protected function getViewData(): array
    {
        return array_merge(parent::getViewData(), [
            'orgName' => $this->orgName,
            'summary' => $this->summary,
        ]);
    }
}
