<?php

namespace App\Services\Alerts;

use App\Models\Alert;
use App\Models\Device;
use App\Models\Gateway;
use App\Models\Site;
use Illuminate\Support\Facades\Log;

class MassOfflineDetector
{
    /**
     * Check if a site is experiencing mass offline (>50% devices in 5 min).
     * Returns true if mass offline detected (caller should suppress individual work orders).
     */
    public function check(Site $site): bool
    {
        $totalDevices = Device::where('site_id', $site->id)
            ->whereIn('status', ['active', 'offline'])
            ->count();

        if ($totalDevices === 0) {
            return false;
        }

        $recentlyOffline = Device::where('site_id', $site->id)
            ->where('status', 'offline')
            ->where(function ($q) {
                $q->whereNull('last_reading_at')
                    ->orWhere('last_reading_at', '<', now()->subMinutes(5));
            })
            ->count();

        $offlinePct = ($recentlyOffline / $totalDevices) * 100;

        if ($offlinePct <= 50) {
            return false;
        }

        $gatewayOffline = $this->isGatewayOffline($site);
        $this->createSiteLevelAlert($site, $recentlyOffline, $totalDevices, $gatewayOffline);

        return true;
    }

    /**
     * Check if gateway is the root cause (BR-078).
     */
    private function isGatewayOffline(Site $site): bool
    {
        return Gateway::where('site_id', $site->id)
            ->where(function ($q) {
                $q->whereNull('last_seen_at')
                    ->orWhere('last_seen_at', '<', now()->subMinutes(30));
            })
            ->exists();
    }

    /**
     * Create ONE site-level alert for mass offline (BR-077).
     */
    private function createSiteLevelAlert(Site $site, int $offline, int $total, bool $gatewayOffline): void
    {
        // Cooldown: 1 per hour per site
        $exists = Alert::where('site_id', $site->id)
            ->where('data->type', 'mass_offline')
            ->where('status', 'active')
            ->where('triggered_at', '>=', now()->subHour())
            ->exists();

        if ($exists) {
            return;
        }

        $message = $gatewayOffline
            ? "Gateway offline at {$site->name} — {$offline} of {$total} devices affected"
            : "Possible power outage at {$site->name} — {$offline} of {$total} devices offline";

        Alert::create([
            'site_id' => $site->id,
            'severity' => 'critical',
            'status' => 'active',
            'triggered_at' => now(),
            'data' => [
                'type' => 'mass_offline',
                'rule_name' => $gatewayOffline ? 'Gateway Offline' : 'Mass Offline Detection',
                'device_name' => $site->name,
                'metric' => 'offline_devices',
                'value' => $offline,
                'threshold' => $total,
                'condition' => 'above',
                'message' => $message,
                'gateway_offline' => $gatewayOffline,
            ],
        ]);

        Log::warning("MassOfflineDetector: {$message}");
    }
}
