<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoorBaseline extends Model
{
    protected $fillable = [
        'device_id',
        'day_of_week',
        'hour',
        'avg_opens',
        'avg_duration',
        'std_dev_opens',
    ];

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'hour' => 'integer',
            'avg_opens' => 'double',
            'avg_duration' => 'double',
            'std_dev_opens' => 'double',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
