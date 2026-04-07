<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ZoneBoundary extends Model
{
    use HasFactory;

    protected $fillable = [
        'site_id',
        'floor_plan_id',
        'name',
        'color',
        'x',
        'y',
        'width',
        'height',
    ];

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function floorPlan(): BelongsTo
    {
        return $this->belongsTo(FloorPlan::class);
    }
}
