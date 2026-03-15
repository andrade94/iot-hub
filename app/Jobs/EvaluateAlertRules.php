<?php

namespace App\Jobs;

use App\Models\Device;
use App\Services\RulesEngine\RuleEvaluator;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class EvaluateAlertRules implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function __construct(
        public int $deviceId,
        public array $readings,
    ) {}

    public function handle(RuleEvaluator $evaluator): void
    {
        $device = Device::find($this->deviceId);
        if (! $device) {
            return;
        }

        $evaluator->evaluate($device, $this->readings);
    }
}
