<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrafficSnapshot extends Model
{
    protected $fillable = [
        'site_id',
        'zone',
        'date',
        'hour',
        'occupancy_avg',
        'occupancy_peak',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'hour' => 'integer',
            'occupancy_avg' => 'double',
            'occupancy_peak' => 'integer',
        ];
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }
}
