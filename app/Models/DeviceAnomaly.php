<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeviceAnomaly extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'device_id',
        'metric',
        'value',
        'valid_min',
        'valid_max',
        'unit',
        'recorded_at',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'float',
            'valid_min' => 'float',
            'valid_max' => 'float',
            'recorded_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
