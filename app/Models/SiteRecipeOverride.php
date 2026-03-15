<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SiteRecipeOverride extends Model
{
    protected $fillable = [
        'site_id',
        'recipe_id',
        'overridden_rules',
        'overridden_by',
    ];

    protected function casts(): array
    {
        return [
            'overridden_rules' => 'array',
        ];
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function recipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class);
    }

    public function overriddenByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'overridden_by');
    }
}
