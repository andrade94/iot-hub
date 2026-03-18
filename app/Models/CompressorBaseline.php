<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompressorBaseline extends Model
{
    use HasFactory;

    protected $fillable = [
        'device_id',
        'date',
        'duty_cycle_pct',
        'on_count',
        'avg_on_duration',
        'avg_off_duration',
        'degradation_score',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'duty_cycle_pct' => 'double',
            'on_count' => 'integer',
            'avg_on_duration' => 'double',
            'avg_off_duration' => 'double',
            'degradation_score' => 'double',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
