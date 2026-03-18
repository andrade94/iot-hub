<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SiteModule extends Model
{
    use HasFactory;

    protected $table = 'site_modules';

    protected $fillable = [
        'site_id',
        'module_id',
        'activated_at',
        'config',
    ];

    protected function casts(): array
    {
        return [
            'config' => 'array',
            'activated_at' => 'datetime',
        ];
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }
}
