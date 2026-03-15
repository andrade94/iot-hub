<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IaqZoneScore extends Model
{
    protected $fillable = [
        'site_id',
        'zone',
        'date',
        'avg_co2',
        'avg_temp',
        'avg_humidity',
        'avg_tvoc',
        'comfort_score',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'avg_co2' => 'double',
            'avg_temp' => 'double',
            'avg_humidity' => 'double',
            'avg_tvoc' => 'double',
            'comfort_score' => 'double',
        ];
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }
}
