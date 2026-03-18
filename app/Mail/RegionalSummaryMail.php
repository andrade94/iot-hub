<?php

namespace App\Mail;

class RegionalSummaryMail extends BaseMailable
{
    /**
     * Create a new message instance.
     */
    public function __construct(
        public string $managerName,
        public array $summary,
    ) {
        parent::__construct();
    }

    /**
     * Get the subject of the email.
     */
    protected function getSubject(): string
    {
        return "Regional Summary — {$this->managerName}";
    }

    /**
     * Get the view for the email.
     */
    protected function getView(): string
    {
        return 'emails.regional-summary';
    }

    /**
     * Get the data for the view.
     */
    protected function getViewData(): array
    {
        return array_merge(parent::getViewData(), [
            'managerName' => $this->managerName,
            'summary' => $this->summary,
        ]);
    }
}
