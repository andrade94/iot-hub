<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Segment extends Model
{
    protected $fillable = [
        'name',
        'label',
        'description',
        'suggested_modules',
        'suggested_sensor_models',
        'icon',
        'color',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'suggested_modules' => 'array',
            'suggested_sensor_models' => 'array',
            'active' => 'boolean',
        ];
    }

    /**
     * Scope to only active segments.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('active', true);
    }

    /**
     * Get organizations that use this segment (string match on org.segment).
     */
    public function organizations()
    {
        return Organization::where('segment', $this->name);
    }

    /**
     * Count organizations using this segment name.
     */
    public function getOrganizationsCountAttribute(): int
    {
        return Organization::where('segment', $this->name)->count();
    }
}
