<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SensorModel extends Model
{
    protected $fillable = [
        'name',
        'label',
        'manufacturer',
        'description',
        'supported_metrics',
        'valid_ranges',
        'monthly_fee',
        'decoder_class',
        'icon',
        'color',
        'active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'supported_metrics' => 'array',
            'valid_ranges' => 'array',
            'monthly_fee' => 'decimal:2',
            'active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * Scope to only active sensor models.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('active', true);
    }

    /**
     * Devices that use this sensor model (matched on device.model = sensor_model.name).
     */
    public function devices(): HasMany
    {
        return $this->hasMany(Device::class, 'model', 'name');
    }

    /**
     * Count of devices using this sensor model.
     */
    public function getDevicesCountAttribute(): int
    {
        return Device::where('model', $this->name)->count();
    }
}
