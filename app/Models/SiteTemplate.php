<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SiteTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'org_id',
        'name',
        'description',
        'segment',
        'modules',
        'zone_config',
        'recipe_assignments',
        'alert_rules',
        'maintenance_windows',
        'escalation_structure',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'modules' => 'array',
            'zone_config' => 'array',
            'recipe_assignments' => 'array',
            'alert_rules' => 'array',
            'maintenance_windows' => 'array',
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

    /** Sites that were created or configured from this template. */
    public function sites(): HasMany
    {
        return $this->hasMany(Site::class, 'template_id');
    }

    // --- Scopes ---

    public function scopeForOrg(mixed $query, int $orgId): mixed
    {
        return $query->where('org_id', $orgId);
    }
}
