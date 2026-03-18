<?php

namespace App\Mail;

use App\Models\Alert;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class AlertMail extends BaseMailable
{
    public function __construct(
        public Alert $alert,
    ) {
        parent::__construct();
    }

    protected function getSubject(): string
    {
        $severity = strtoupper($this->alert->severity);
        $siteName = $this->alert->site?->name ?? 'Unknown Site';

        return "[{$severity}] Alert — {$siteName}";
    }

    protected function getView(): string
    {
        return 'emails.alert';
    }

    protected function getViewData(): array
    {
        return array_merge(parent::getViewData(), [
            'alert' => $this->alert,
            'severity' => $this->alert->severity,
            'siteName' => $this->alert->site?->name ?? 'Unknown',
            'deviceName' => $this->alert->device?->name ?? 'Unknown',
            'metric' => $this->alert->data['metric'] ?? null,
            'value' => $this->alert->data['value'] ?? null,
            'threshold' => $this->alert->data['threshold'] ?? null,
            'triggeredAt' => $this->alert->triggered_at,
        ]);
    }
}
