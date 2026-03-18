<?php

namespace App\Jobs;

use App\Models\Device;
use App\Models\Site;
use App\Models\Subscription;
use App\Models\SubscriptionItem;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SyncSubscriptionMetering implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function handle(): void
    {
        $subscriptions = Subscription::where('status', 'active')
            ->with('items')
            ->get();

        foreach ($subscriptions as $subscription) {
            $this->syncDevices($subscription);
        }
    }

    protected function syncDevices(Subscription $subscription): void
    {
        $orgId = $subscription->org_id;
        $siteIds = Site::where('org_id', $orgId)->pluck('id');

        // Get all active devices for this org
        $devices = Device::whereIn('site_id', $siteIds)
            ->where('status', 'active')
            ->get();

        // Get existing subscription items
        $existingDeviceIds = $subscription->items()->pluck('device_id')->toArray();

        // Pricing map by sensor model
        $priceMap = [
            'EM300-TH' => 150.00,
            'EM300-MCS' => 200.00,
            'EM500-CO2' => 250.00,
            'EM500-PT100' => 180.00,
            'VS121' => 200.00,
            'CT101' => 200.00,
            'EM310-UDL' => 150.00,
            'AM307' => 250.00,
            'WS301' => 80.00,
            'DS3604' => 120.00,
        ];

        $added = 0;
        $removed = 0;

        // Add missing devices
        foreach ($devices as $device) {
            if (! in_array($device->id, $existingDeviceIds)) {
                SubscriptionItem::create([
                    'subscription_id' => $subscription->id,
                    'device_id' => $device->id,
                    'sensor_model' => $device->model,
                    'monthly_fee' => $priceMap[$device->model] ?? 150.00,
                ]);
                $added++;
            }
        }

        // Remove items for devices that no longer exist or are inactive
        $activeDeviceIds = $devices->pluck('id')->toArray();
        $toRemove = $subscription->items()
            ->whereNotIn('device_id', $activeDeviceIds)
            ->get();

        foreach ($toRemove as $item) {
            $item->delete();
            $removed++;
        }

        if ($added > 0 || $removed > 0) {
            Log::info('Subscription metering synced', [
                'subscription_id' => $subscription->id,
                'org_id' => $orgId,
                'added' => $added,
                'removed' => $removed,
                'total_items' => $subscription->items()->count(),
            ]);
        }
    }
}
