<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class ComplianceEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'site_id',
        'org_id',
        'type',
        'title',
        'description',
        'due_date',
        'status',
        'completed_at',
        'completed_by',
        'attachment_path',
        'attachment_name',
        'reminders_sent',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'completed_at' => 'date',
            'reminders_sent' => 'array',
        ];
    }

    // -- Relationships ────────────────────────────────────────────

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'org_id');
    }

    // -- Scopes ───────────────────────────────────────────────────

    public function scopeUpcoming(Builder $query): Builder
    {
        return $query->where('status', 'upcoming');
    }

    public function scopeOverdue(Builder $query): Builder
    {
        return $query->where('status', 'overdue');
    }

    public function scopeForSite(Builder $query, int $siteId): Builder
    {
        return $query->where('site_id', $siteId);
    }

    public function scopeForOrg(Builder $query, int $orgId): Builder
    {
        return $query->where('org_id', $orgId);
    }

    // -- Lifecycle ────────────────────────────────────────────────

    protected static function booted(): void
    {
        // Clean the attachment off disk when the event is deleted.
        static::deleting(function (ComplianceEvent $event) {
            if ($event->attachment_path) {
                Storage::disk('public')->delete($event->attachment_path);
            }
        });
    }
}
