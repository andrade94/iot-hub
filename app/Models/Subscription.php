<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
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

    /**
     * Calculate the monthly total: base_fee * (1 - discount_pct/100) + sum of items monthly_fee.
     */
    public function calculateMonthlyTotal(): float
    {
        $discountedBase = (float) $this->base_fee * (1 - (float) $this->discount_pct / 100);
        $itemsTotal = $this->items()->sum('monthly_fee');

        return round($discountedBase + (float) $itemsTotal, 2);
    }
}
