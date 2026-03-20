<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportSchedule extends Model
{
    public const TYPES = [
        'temperature_compliance',
        'energy_summary',
        'alert_summary',
        'executive_overview',
    ];

    protected $fillable = [
        'org_id',
        'site_id',
        'type',
        'frequency',
        'day_of_week',
        'time',
        'recipients_json',
        'active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'recipients_json' => 'array',
            'day_of_week' => 'integer',
            'active' => 'boolean',
        ];
    }

    /**
     * Check if this schedule should fire today.
     */
    public function shouldFireToday(): bool
    {
        if (! $this->active) {
            return false;
        }

        $today = now()->dayOfWeek;

        return match ($this->frequency) {
            'daily' => true,
            'weekly' => $this->day_of_week === $today,
            'monthly' => now()->day === 1,
            default => false,
        };
    }

    // --- Relationships ---

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'org_id');
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // --- Scopes ---

    public function scopeActive(mixed $query): mixed
    {
        return $query->where('active', true);
    }

    public function scopeForOrg(mixed $query, int $orgId): mixed
    {
        return $query->where('org_id', $orgId);
    }
}
