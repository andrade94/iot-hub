<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Recipe extends Model
{
    use HasFactory;

    protected $fillable = [
        'module_id',
        'sensor_model',
        'name',
        'name_es',
        'default_rules',
        'description',
        'editable',
    ];

    /**
     * Get the recipe name in the given locale, falling back to the
     * default (English) name if no translation exists.
     */
    public function localizedName(string $locale = 'en'): string
    {
        if ($locale === 'es' && $this->name_es) {
            return $this->name_es;
        }

        return $this->name;
    }

    public function setNameAttribute(string $value): void
    {
        $this->attributes['name'] = ucwords(trim($value));
    }

    protected function casts(): array
    {
        return [
            'default_rules' => 'array',
            'editable' => 'boolean',
        ];
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    public function devices(): HasMany
    {
        return $this->hasMany(Device::class);
    }

    public function overrides(): HasMany
    {
        return $this->hasMany(SiteRecipeOverride::class);
    }
}
