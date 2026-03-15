<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SensorReading extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'time',
        'device_id',
        'metric',
        'value',
        'unit',
    ];

    protected function casts(): array
    {
        return [
            'time' => 'datetime',
            'value' => 'double',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
