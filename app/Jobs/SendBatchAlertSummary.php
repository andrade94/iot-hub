<?php

namespace App\Jobs;

use App\Models\Alert;
use App\Models\Organization;
use App\Models\User;
use App\Services\WhatsApp\TwilioService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class SendBatchAlertSummary implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $backoff = 60;

    public function __construct(
        public int $orgId,
    ) {}

    public function handle(): void
    {
        $setKey = "alert_batch_ids:{$this->orgId}";
        $batchKey = "alert_batch:{$this->orgId}";
        $scheduledKey = "alert_batch_scheduled:{$this->orgId}";

        try {
            $alertIds = Redis::smembers($setKey);
        } catch (\Exception $e) {
            Log::error('Failed to read batched alert IDs from Redis', [
                'org_id' => $this->orgId,
                'error' => $e->getMessage(),
            ]);

            return;
        }

        if (empty($alertIds)) {
            Log::info('No batched alerts found for org', ['org_id' => $this->orgId]);
            $this->cleanupRedisKeys($setKey, $batchKey, $scheduledKey);

            return;
        }

        // Load all batched alerts grouped by site
        $alerts = Alert::whereIn('id', $alertIds)
            ->with('site:id,name')
            ->get();

        $bySite = $alerts->groupBy(fn (Alert $alert) => $alert->site?->name ?? 'Unknown');
        $totalCount = $alerts->count();
        $siteCount = $bySite->count();

        // Build summary message
        $message = "⚠️ {$totalCount} alerts across {$siteCount} sites in the last 10 minutes\n\n";

        foreach ($bySite as $siteName => $siteAlerts) {
            $criticalCount = $siteAlerts->where('severity', 'critical')->count();
            $highCount = $siteAlerts->where('severity', 'high')->count();
            $otherCount = $siteAlerts->count() - $criticalCount - $highCount;

            $message .= "📍 {$siteName}: {$siteAlerts->count()} alerts";
            $breakdown = [];
            if ($criticalCount > 0) {
                $breakdown[] = "{$criticalCount} critical";
            }
            if ($highCount > 0) {
                $breakdown[] = "{$highCount} high";
            }
            if ($otherCount > 0) {
                $breakdown[] = "{$otherCount} other";
            }
            if (! empty($breakdown)) {
                $message .= ' ('.implode(', ', $breakdown).')';
            }
            $message .= "\n";
        }

        // Send to org_admin users via WhatsApp
        $org = Organization::with('users')->find($this->orgId);
        if (! $org) {
            Log::warning('Organization not found for batch alert summary', ['org_id' => $this->orgId]);
            $this->cleanupRedisKeys($setKey, $batchKey, $scheduledKey);

            return;
        }

        $admins = $org->users->filter(
            fn (User $user) => $user->hasRole('org_admin'),
        );

        $twilio = app(TwilioService::class);

        foreach ($admins as $admin) {
            if ($admin->whatsapp_phone) {
                $twilio->sendFreeformMessage($admin->whatsapp_phone, $message);
            }
        }

        Log::info('Batch alert summary sent', [
            'org_id' => $this->orgId,
            'alert_count' => $totalCount,
            'site_count' => $siteCount,
            'admin_count' => $admins->count(),
        ]);

        $this->cleanupRedisKeys($setKey, $batchKey, $scheduledKey);
    }

    /**
     * Clean up the Redis keys used for batching.
     */
    protected function cleanupRedisKeys(string ...$keys): void
    {
        try {
            Redis::del(...$keys);
        } catch (\Exception $e) {
            Log::debug('Failed to clean up Redis batch keys', ['error' => $e->getMessage()]);
        }
    }
}
