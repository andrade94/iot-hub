<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SiteTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'org_id',
        'name',
        'description',
        'modules',
        'zone_config',
        'recipe_assignments',
        'escalation_structure',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'modules' => 'array',
            'zone_config' => 'array',
            'recipe_assignments' => 'array',
            'escalation_structure' => 'array',
        ];
    }

    // --- Relationships ---

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'org_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // --- Scopes ---

    public function scopeForOrg(mixed $query, int $orgId): mixed
    {
        return $query->where('org_id', $orgId);
    }
}
