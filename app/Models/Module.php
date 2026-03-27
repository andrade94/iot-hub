<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Module extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'slug',
        'name',
        'description',
        'monthly_fee',
        'required_sensor_models',
        'report_types',
        'icon',
        'color',
        'active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'required_sensor_models' => 'array',
            'report_types' => 'array',
            'monthly_fee' => 'decimal:2',
            'active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function recipes(): HasMany
    {
        return $this->hasMany(Recipe::class);
    }

    public function sites(): BelongsToMany
    {
        return $this->belongsToMany(Site::class, 'site_modules')
            ->withPivot(['activated_at', 'config']);
    }

    /**
     * Scope to only active modules.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('active', true);
    }

    /**
     * Get count of sites that have this module activated.
     */
    public function getSitesCountAttribute(): int
    {
        return $this->sites()->count();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['slug', 'name', 'description', 'monthly_fee', 'active', 'sort_order'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $eventName) => "Module {$eventName}");
    }
}
