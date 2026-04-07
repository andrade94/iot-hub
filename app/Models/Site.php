<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Site extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'org_id',
        'name',
        'address',
        'lat',
        'lng',
        'timezone',
        'opening_hour',
        'segment_override',
        'install_date',
        'status',
        'floor_plan_count',
    ];

    protected function casts(): array
    {
        return [
            'lat' => 'float',
            'lng' => 'float',
            'opening_hour' => 'datetime:H:i',
            'install_date' => 'date',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'org_id');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_sites')
            ->withPivot(['role', 'assigned_at', 'assigned_by']);
    }

    public function gateways(): HasMany
    {
        return $this->hasMany(Gateway::class);
    }

    public function devices(): HasMany
    {
        return $this->hasMany(Device::class);
    }

    public function floorPlans(): HasMany
    {
        return $this->hasMany(FloorPlan::class);
    }

    public function modules(): BelongsToMany
    {
        return $this->belongsToMany(Module::class, 'site_modules')
            ->withPivot(['activated_at', 'config']);
    }

    public function siteModules(): HasMany
    {
        return $this->hasMany(SiteModule::class);
    }

    public function recipeOverrides(): HasMany
    {
        return $this->hasMany(SiteRecipeOverride::class);
    }

    public function alertRules(): HasMany
    {
        return $this->hasMany(AlertRule::class);
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class);
    }

    public function escalationChains(): HasMany
    {
        return $this->hasMany(EscalationChain::class);
    }

    public function zoneBoundaries(): HasMany
    {
        return $this->hasMany(ZoneBoundary::class);
    }

    public function workOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class);
    }

    public function temperatureVerifications(): HasMany
    {
        return $this->hasMany(TemperatureVerification::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    public function scopeForOrganization(Builder $query, int $orgId): Builder
    {
        return $query->where('org_id', $orgId);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'address', 'status', 'timezone'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $eventName) => "Site {$eventName}");
    }
}
