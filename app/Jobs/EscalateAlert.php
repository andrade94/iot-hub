<?php

namespace App\Jobs;

use App\Models\Alert;
use App\Models\EscalationChain;
use App\Services\Alerts\EscalationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class EscalateAlert implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $backoff = 60;

    public function __construct(
        public Alert $alert,
        public EscalationChain $chain,
        public int $level = 1,
    ) {}

    public function handle(EscalationService $escalationService): void
    {
        $escalationService->escalate($this->alert, $this->chain, $this->level);
    }
}
