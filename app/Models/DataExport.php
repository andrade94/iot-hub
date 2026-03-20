<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataExport extends Model
{
    protected $fillable = [
        'org_id',
        'status',
        'date_from',
        'date_to',
        'file_path',
        'file_size',
        'attempts',
        'error',
        'completed_at',
        'expires_at',
        'requested_by',
    ];

    protected function casts(): array
    {
        return [
            'date_from' => 'date',
            'date_to' => 'date',
            'file_size' => 'integer',
            'attempts' => 'integer',
            'completed_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    // --- State Machine (SM-012) ---

    private const TRANSITIONS = [
        'queued' => ['processing'],
        'processing' => ['completed', 'failed'],
        'failed' => ['queued'],
        'completed' => ['expired'],
    ];

    public function canTransitionTo(string $newStatus): bool
    {
        return in_array($newStatus, self::TRANSITIONS[$this->status] ?? []);
    }

    public function markProcessing(): self
    {
        $this->update(['status' => 'processing', 'attempts' => $this->attempts + 1]);

        return $this;
    }

    public function markCompleted(string $filePath, int $fileSize): self
    {
        $this->update([
            'status' => 'completed',
            'file_path' => $filePath,
            'file_size' => $fileSize,
            'completed_at' => now(),
            'expires_at' => now()->addHours(48),
            'error' => null,
        ]);

        return $this;
    }

    public function markFailed(string $error): self
    {
        $this->update([
            'status' => 'failed',
            'error' => $error,
        ]);

        return $this;
    }

    // --- Relationships ---

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'org_id');
    }

    public function requestedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    // --- Scopes ---

    public function scopeForOrg(mixed $query, int $orgId): mixed
    {
        return $query->where('org_id', $orgId);
    }

    public function scopeActive(mixed $query): mixed
    {
        return $query->whereIn('status', ['queued', 'processing']);
    }
}
