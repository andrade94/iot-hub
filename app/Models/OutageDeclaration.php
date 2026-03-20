<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OutageDeclaration extends Model
{
    use HasFactory;

    protected $fillable = [
        'reason',
        'affected_services',
        'status',
        'declared_by',
        'declared_at',
        'resolved_by',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'affected_services' => 'array',
            'declared_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    // --- State Machine (SM-013: active → resolved) ---

    public function resolve(int $userId): self
    {
        if ($this->status !== 'active') {
            throw new \InvalidArgumentException('Only active outages can be resolved.');
        }

        $this->update([
            'status' => 'resolved',
            'resolved_by' => $userId,
            'resolved_at' => now(),
        ]);

        return $this;
    }

    /**
     * Check if there's currently an active outage declaration (BR-080).
     */
    public static function isActive(): bool
    {
        return static::where('status', 'active')->exists();
    }

    /**
     * Get the current active outage, if any.
     */
    public static function current(): ?self
    {
        return static::where('status', 'active')->latest('declared_at')->first();
    }

    // --- Relationships ---

    public function declaredByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'declared_by');
    }

    public function resolvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
