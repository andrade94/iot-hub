<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Organization extends Model
{
    use LogsActivity, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'segment',
        'plan',
        'settings',
        'logo',
        'branding',
        'default_opening_hour',
        'default_timezone',
    ];

    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'branding' => 'array',
            'default_opening_hour' => 'datetime:H:i',
        ];
    }

    public function sites(): HasMany
    {
        return $this->hasMany(Site::class, 'org_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'org_id');
    }

    public function billingProfiles(): HasMany
    {
        return $this->hasMany(BillingProfile::class, 'org_id');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class, 'org_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'org_id');
    }

    public function isSegment(string $segment): bool
    {
        return $this->segment === $segment;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'segment', 'plan', 'settings'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $eventName) => "Organization {$eventName}");
    }
}
