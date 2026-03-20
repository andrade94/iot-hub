<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class CorrectiveAction extends Model
{
    use HasFactory;

    use LogsActivity;

    protected $fillable = [
        'alert_id',
        'site_id',
        'action_taken',
        'notes',
        'status',
        'taken_by',
        'taken_at',
        'verified_by',
        'verified_at',
    ];

    protected function casts(): array
    {
        return [
            'taken_at' => 'datetime',
            'verified_at' => 'datetime',
        ];
    }

    // --- State Machine (SM-011: logged → verified) ---

    public function verify(int $userId): self
    {
        if ($this->status !== 'logged') {
            throw new \InvalidArgumentException('Only logged actions can be verified.');
        }

        if ($this->taken_by === $userId) {
            throw new \InvalidArgumentException('Cannot verify your own corrective action.');
        }

        $this->update([
            'status' => 'verified',
            'verified_by' => $userId,
            'verified_at' => now(),
        ]);

        return $this;
    }

    // --- Relationships ---

    public function alert(): BelongsTo
    {
        return $this->belongsTo(Alert::class);
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function takenByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'taken_by');
    }

    public function verifiedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    // --- Scopes ---

    public function scopeForAlert(mixed $query, int $alertId): mixed
    {
        return $query->where('alert_id', $alertId);
    }

    public function scopePendingVerification(mixed $query): mixed
    {
        return $query->where('status', 'logged');
    }

    // --- Activity Log ---

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['action_taken', 'status', 'verified_by'])
            ->logOnlyDirty();
    }
}
