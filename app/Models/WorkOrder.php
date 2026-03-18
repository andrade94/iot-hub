<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class WorkOrder extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'site_id',
        'alert_id',
        'device_id',
        'type',
        'title',
        'description',
        'status',
        'priority',
        'assigned_to',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'assigned_to' => 'integer',
            'created_by' => 'integer',
        ];
    }

    // ── Relationships ────────────────────────────────────────────

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function alert(): BelongsTo
    {
        return $this->belongsTo(Alert::class);
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(WorkOrderPhoto::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(WorkOrderNote::class);
    }

    // ── Scopes ───────────────────────────────────────────────────

    public function scopeOpen(Builder $query): Builder
    {
        return $query->where('status', 'open');
    }

    public function scopeForSite(Builder $query, int $siteId): Builder
    {
        return $query->where('site_id', $siteId);
    }

    public function scopeAssignedTo(Builder $query, int $userId): Builder
    {
        return $query->where('assigned_to', $userId);
    }

    // ── Methods ──────────────────────────────────────────────────

    public function assign(int $userId): self
    {
        $this->update([
            'assigned_to' => $userId,
            'status' => 'assigned',
        ]);

        return $this;
    }

    public function start(): self
    {
        $this->update(['status' => 'in_progress']);

        return $this;
    }

    public function complete(): self
    {
        $this->update(['status' => 'completed']);

        return $this;
    }

    public function cancel(): self
    {
        $this->update(['status' => 'cancelled']);

        return $this;
    }

    // ── Activity Log ─────────────────────────────────────────────

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['title', 'status', 'priority', 'type', 'assigned_to'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $eventName) => "Work order {$eventName}");
    }
}
