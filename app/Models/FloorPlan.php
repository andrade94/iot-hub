<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FloorPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'site_id',
        'name',
        'floor_number',
        'image_path',
        'width_px',
        'height_px',
    ];

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function devices(): HasMany
    {
        return $this->hasMany(Device::class, 'floor_id');
    }
}
