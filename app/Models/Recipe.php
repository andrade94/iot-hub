<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Recipe extends Model
{
    use HasFactory;

    protected $fillable = [
        'module_id',
        'sensor_model',
        'name',
        'default_rules',
        'description',
        'editable',
    ];

    protected function casts(): array
    {
        return [
            'default_rules' => 'array',
            'editable' => 'boolean',
        ];
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    public function devices(): HasMany
    {
        return $this->hasMany(Device::class);
    }

    public function overrides(): HasMany
    {
        return $this->hasMany(SiteRecipeOverride::class);
    }
}
