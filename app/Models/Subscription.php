<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'org_id',
        'billing_profile_id',
        'base_fee',
        'discount_pct',
        'status',
        'started_at',
        'contract_type',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'base_fee' => 'decimal:2',
            'discount_pct' => 'decimal:2',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'org_id');
    }

    public function billingProfile(): BelongsTo
    {
        return $this->belongsTo(BillingProfile::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SubscriptionItem::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'billing_profile_id', 'billing_profile_id');
    }

    /**
     * Calculate the monthly total: base_fee * (1 - discount_pct/100) + sum of items monthly_fee + addon gateway fees.
     */
    public function calculateMonthlyTotal(): float
    {
        $discountedBase = (float) $this->base_fee * (1 - (float) $this->discount_pct / 100);
        $itemsTotal = $this->items()->sum('monthly_fee');

        // Add gateway addon fees ($2,500 MXN/month per addon gateway)
        $addonGatewayFee = 2500.00;
        $addonGatewayCount = Gateway::whereIn('site_id',
            Site::where('org_id', $this->org_id)->pluck('id')
        )->where('is_addon', true)->count();

        $gatewayTotal = $addonGatewayCount * $addonGatewayFee;

        return round($discountedBase + (float) $itemsTotal + $gatewayTotal, 2);
    }
}
