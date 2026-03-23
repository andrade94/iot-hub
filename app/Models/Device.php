<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * @property-read DeviceCalibration|null $latestCalibration
 */
class Device extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'site_id',
        'gateway_id',
        'model',
        'dev_eui',
        'app_key',
        'name',
        'zone',
        'floor_id',
        'floor_x',
        'floor_y',
        'recipe_id',
        'installed_at',
        'battery_pct',
        'rssi',
        'last_reading_at',
        'status',
        'provisioned_at',
        'provisioned_by',
        'replaced_device_id',
    ];

    protected function casts(): array
    {
        return [
            'app_key' => 'encrypted',
            'installed_at' => 'datetime',
            'last_reading_at' => 'datetime',
            'provisioned_at' => 'datetime',
        ];
    }

    public function calibrations(): HasMany
    {
        return $this->hasMany(DeviceCalibration::class);
    }

    public function latestCalibration(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(DeviceCalibration::class)->latestOfMany('calibrated_at');
    }

    public function calibrationStatus(): string
    {
        $cal = $this->latestCalibration;
        if (! $cal) {
            return 'none';
        }

        return $cal->calibrationStatus();
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function gateway(): BelongsTo
    {
        return $this->belongsTo(Gateway::class);
    }

    public function recipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class);
    }

    public function floorPlan(): BelongsTo
    {
        return $this->belongsTo(FloorPlan::class, 'floor_id');
    }

    public function readings(): HasMany
    {
        return $this->hasMany(SensorReading::class);
    }

    public function replacedDevice(): BelongsTo
    {
        return $this->belongsTo(self::class, 'replaced_device_id');
    }

    public function alertRules(): HasMany
    {
        return $this->hasMany(AlertRule::class);
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class);
    }

    public function provisionedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'provisioned_by');
    }

    public function workOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class);
    }

    public function scopeOnline(Builder $query): Builder
    {
        return $query->where('last_reading_at', '>=', now()->subMinutes(15));
    }

    public function scopeOffline(Builder $query): Builder
    {
        return $query->where(function ($q) {
            $q->whereNull('last_reading_at')
                ->orWhere('last_reading_at', '<', now()->subMinutes(15));
        });
    }

    public function scopeLowBattery(Builder $query): Builder
    {
        return $query->whereNotNull('battery_pct')
            ->where('battery_pct', '<', 20);
    }

    public function scopeForSite(Builder $query, int $siteId): Builder
    {
        return $query->where('site_id', $siteId);
    }

    public function isOnline(): bool
    {
        return $this->last_reading_at && $this->last_reading_at->gte(now()->subMinutes(15));
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'dev_eui', 'model', 'status', 'zone', 'gateway_id', 'recipe_id'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $eventName) => "Device {$eventName}");
    }
}
