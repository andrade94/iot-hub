<?php

namespace App\Http\Controllers;

use App\Models\SensorReading;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class HealthCheckController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'db' => $this->checkDatabase(),
            'redis' => $this->checkRedis(),
            'queue_depth' => $this->getQueueDepth(),
            'last_mqtt_reading_at' => $this->getLastReadingTime(),
        ];

        $healthy = $checks['db'] && $checks['redis'];

        return response()->json([
            'status' => $healthy ? 'ok' : 'degraded',
            'checks' => $checks,
            'timestamp' => now()->toIso8601String(),
        ], $healthy ? 200 : 503);
    }

    private function checkDatabase(): bool
    {
        try {
            DB::connection()->getPdo();

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function checkRedis(): bool
    {
        try {
            Redis::ping();

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function getQueueDepth(): int
    {
        try {
            return (int) Redis::llen('queues:default');
        } catch (\Throwable) {
            return -1;
        }
    }

    private function getLastReadingTime(): ?string
    {
        try {
            return SensorReading::orderByDesc('time')
                ->value('time')
                ?->toIso8601String();
        } catch (\Throwable) {
            return null;
        }
    }
}
