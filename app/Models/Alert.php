<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Alert extends Model
{
    use HasFactory;

    /**
     * SM-001: Allowed state transitions for the alert lifecycle.
     */
    protected static array $transitions = [
        'active' => ['acknowledged', 'resolved', 'dismissed'],
        'acknowledged' => ['resolved', 'dismissed'],
        // resolved and dismissed are terminal states
    ];

    public function canTransitionTo(string $newStatus): bool
    {
        return in_array($newStatus, static::$transitions[$this->status] ?? []);
    }

    protected $fillable = [
        'rule_id',
        'site_id',
        'device_id',
        'severity',
        'status',
        'triggered_at',
        'acknowledged_at',
        'resolved_at',
        'resolved_by',
        'resolution_type',
        'data',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'triggered_at' => 'datetime',
            'acknowledged_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public function rule(): BelongsTo
    {
        return $this->belongsTo(AlertRule::class, 'rule_id');
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }

    public function resolvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(AlertNotification::class);
    }

    public function correctiveActions(): HasMany
    {
        return $this->hasMany(CorrectiveAction::class);
    }

    public function snoozes(): HasMany
    {
        return $this->hasMany(AlertSnooze::class);
    }

    public function isSnoozedFor(int $userId): bool
    {
        return $this->snoozes()->where('user_id', $userId)->active()->exists();
    }

    public function acknowledge(int $userId): self
    {
        if (! $this->canTransitionTo('acknowledged')) {
            throw new \InvalidArgumentException("Cannot acknowledge alert in '{$this->status}' status");
        }

        $this->update([
            'status' => 'acknowledged',
            'acknowledged_at' => now(),
            'resolved_by' => $userId,
        ]);

        return $this;
    }

    public function resolve(?int $userId, string $type = 'manual'): self
    {
        if (! $this->canTransitionTo('resolved')) {
            throw new \InvalidArgumentException("Cannot resolve alert in '{$this->status}' status");
        }

        $this->update([
            'status' => 'resolved',
            'resolved_at' => now(),
            'resolved_by' => $userId,
            'resolution_type' => $type,
        ]);

        return $this;
    }

    public function dismiss(int $userId): self
    {
        if (! $this->canTransitionTo('dismissed')) {
            throw new \InvalidArgumentException("Cannot dismiss alert in '{$this->status}' status");
        }

        $this->update([
            'status' => 'dismissed',
            'resolved_at' => now(),
            'resolved_by' => $userId,
            'resolution_type' => 'dismissed',
        ]);

        return $this;
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    public function scopeUnresolved(Builder $query): Builder
    {
        return $query->whereIn('status', ['active', 'acknowledged']);
    }

    public function scopeForSite(Builder $query, int $siteId): Builder
    {
        return $query->where('site_id', $siteId);
    }
}
