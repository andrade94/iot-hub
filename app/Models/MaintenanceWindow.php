<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class MaintenanceWindow extends Model
{
    use LogsActivity;

    protected $fillable = [
        'site_id',
        'zone',
        'title',
        'recurrence',
        'day_of_week',
        'start_time',
        'duration_minutes',
        'suppress_alerts',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'start_time' => 'string',
            'duration_minutes' => 'integer',
            'day_of_week' => 'integer',
            'suppress_alerts' => 'boolean',
        ];
    }

    /**
     * Check if this window is currently active (BR-073).
     */
    public function isActiveNow(?string $timezone = null): bool
    {
        if (! $this->suppress_alerts) {
            return false;
        }

        $tz = $timezone ?? $this->site?->timezone ?? config('app.timezone');
        $now = Carbon::now($tz);
        $today = $now->dayOfWeek;

        $matchesToday = match ($this->recurrence) {
            'once' => true,
            'daily' => true,
            'weekly' => $this->day_of_week === $today,
            'monthly' => $now->day === 1,
            default => false,
        };

        if (! $matchesToday) {
            return false;
        }

        $startToday = $now->copy()->setTimeFromTimeString($this->start_time);
        $endToday = $startToday->copy()->addMinutes($this->duration_minutes);

        return $now->between($startToday, $endToday);
    }

    /**
     * Static: is there an active maintenance window for this site+zone? (BR-073)
     */
    public static function isActiveForZone(int $siteId, ?string $zone, ?string $timezone = null): bool
    {
        $windows = static::where('site_id', $siteId)
            ->where('suppress_alerts', true)
            ->where(function ($q) use ($zone) {
                $q->whereNull('zone')
                    ->orWhere('zone', $zone);
            })
            ->get();

        return $windows->contains(fn ($w) => $w->isActiveNow($timezone));
    }

    // --- Relationships ---

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // --- Scopes ---

    public function scopeForSite(mixed $query, int $siteId): mixed
    {
        return $query->where('site_id', $siteId);
    }

    // --- Activity Log ---

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['title', 'zone', 'recurrence', 'start_time', 'duration_minutes', 'suppress_alerts'])
            ->logOnlyDirty();
    }
}
