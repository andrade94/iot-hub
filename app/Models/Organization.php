<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Organization extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    /**
     * SM-ORG: Organization lifecycle states.
     * active → suspended (non-payment, monitoring continues with warning)
     * active → archived (departed client, data retained 12 months)
     * suspended → active (payment received)
     * archived is terminal (data deletion after retention period)
     */
    protected static array $transitions = [
        'active' => ['suspended', 'archived'],
        'suspended' => ['active', 'archived'],
        // archived is terminal
    ];

    protected $fillable = [
        'name',
        'slug',
        'status',
        'segment',
        'plan',
        'settings',
        'logo',
        'branding',
        'default_timezone',
    ];

    public function canTransitionTo(string $newStatus): bool
    {
        return in_array($newStatus, static::$transitions[$this->status] ?? []);
    }

    public function suspend(): self
    {
        if (! $this->canTransitionTo('suspended')) {
            throw new \InvalidArgumentException("Cannot suspend organization in '{$this->status}' status");
        }
        $this->update(['status' => 'suspended']);

        return $this;
    }

    public function archive(): self
    {
        if (! $this->canTransitionTo('archived')) {
            throw new \InvalidArgumentException("Cannot archive organization in '{$this->status}' status");
        }
        $this->update(['status' => 'archived']);

        return $this;
    }

    public function reactivate(): self
    {
        if ($this->status !== 'suspended') {
            throw new \InvalidArgumentException('Only suspended organizations can be reactivated');
        }
        $this->update(['status' => 'active']);

        return $this;
    }

    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'branding' => 'array',
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

    public function notes(): HasMany
    {
        return $this->hasMany(OrganizationNote::class, 'org_id');
    }

    /**
     * Get the Segment model for this organization (matched by name string).
     */
    public function segmentModel(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Segment::class, 'segment', 'name');
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
