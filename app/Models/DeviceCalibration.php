<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class DeviceCalibration extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'device_id',
        'calibrated_at',
        'expires_at',
        'certificate_path',
        'calibrated_by',
        'method',
        'notes',
        'uploaded_by',
    ];

    protected $casts = [
        'calibrated_at' => 'date',
        'expires_at' => 'date',
    ];

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }

    public function uploadedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isExpiringSoon(int $days = 30): bool
    {
        return ! $this->isExpired() && $this->expires_at->lte(now()->addDays($days));
    }

    public function calibrationStatus(): string
    {
        if ($this->isExpired()) {
            return 'expired';
        }
        if ($this->isExpiringSoon()) {
            return 'expiring';
        }

        return 'valid';
    }

    public function scopeExpiringSoon(Builder $query, int $days = 30): Builder
    {
        return $query->where('expires_at', '>', now())
            ->where('expires_at', '<=', now()->addDays($days));
    }

    public function scopeExpired(Builder $query): Builder
    {
        return $query->where('expires_at', '<', now());
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['calibrated_at', 'expires_at', 'calibrated_by', 'method'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $eventName) => "Device calibration {$eventName}");
    }
}
