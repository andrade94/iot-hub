<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Gateway extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'site_id',
        'model',
        'serial',
        'chirpstack_id',
        'last_seen_at',
        'status',
        'is_addon',
    ];

    protected function casts(): array
    {
        return [
            'last_seen_at' => 'datetime',
            'is_addon' => 'boolean',
        ];
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function devices(): HasMany
    {
        return $this->hasMany(Device::class);
    }

    public function scopeOnline(Builder $query): Builder
    {
        return $query->where('last_seen_at', '>=', now()->subMinutes(15));
    }

    public function scopeForSite(Builder $query, int $siteId): Builder
    {
        return $query->where('site_id', $siteId);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['model', 'serial', 'status', 'is_addon'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $eventName) => "Gateway {$eventName}");
    }
}
