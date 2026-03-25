<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class TemperatureVerification extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'site_id',
        'zone',
        'manual_reading',
        'sensor_reading',
        'discrepancy',
        'verified_by',
        'verified_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'manual_reading' => 'decimal:2',
            'sensor_reading' => 'decimal:2',
            'discrepancy' => 'decimal:2',
            'verified_at' => 'datetime',
        ];
    }

    // ── Relationships ────────────────────────────────────────────

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    // ── Activity Log ─────────────────────────────────────────────

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['zone', 'manual_reading', 'sensor_reading', 'discrepancy'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $eventName) => "Temperature verification {$eventName}");
    }
}
