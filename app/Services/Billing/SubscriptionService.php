<?php

namespace App\Services\Billing;

use App\Models\BillingProfile;
use App\Models\Device;
use App\Models\Organization;
use App\Models\Subscription;
use App\Models\SubscriptionItem;

class SubscriptionService
{
    /**
     * Create a new subscription for an organization.
     */
    public function createSubscription(Organization $org, BillingProfile $profile, string $contractType = 'monthly'): Subscription
    {
        return Subscription::create([
            'org_id' => $org->id,
            'billing_profile_id' => $profile->id,
            'base_fee' => 500.00,
            'discount_pct' => 0.00,
            'status' => 'active',
            'started_at' => now(),
            'contract_type' => $contractType,
        ]);
    }

    /**
     * Add a device to a subscription based on its sensor model pricing.
     */
    public function addDevice(Subscription $sub, Device $device): SubscriptionItem
    {
        $pricing = $this->getSensorPricing();
        $monthlyFee = $pricing[$device->model] ?? 100.00;

        return SubscriptionItem::create([
            'subscription_id' => $sub->id,
            'device_id' => $device->id,
            'sensor_model' => $device->model,
            'monthly_fee' => $monthlyFee,
        ]);
    }

    /**
     * Calculate the monthly total for a subscription.
     * Base fee (with discount) + per-sensor fees + addon gateways.
     */
    public function calculateMonthlyTotal(Subscription $sub): float
    {
        return $sub->calculateMonthlyTotal();
    }

    /**
     * Return the pricing map of sensor model to monthly fee.
     *
     * @return array<string, float>
     */
    public function getSensorPricing(): array
    {
        return [
            'EM300-TH' => 150.00,
            'CT101' => 200.00,
            'WS301' => 100.00,
            'EM300-MCS' => 120.00,
            'EM500-UDL' => 180.00,
            'VS121' => 250.00,
            'AM307' => 175.00,
            'EM300-DI' => 130.00,
            'WS101' => 80.00,
            'WS202' => 90.00,
        ];
    }
}
