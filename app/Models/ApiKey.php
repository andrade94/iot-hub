<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApiKey extends Model
{
    use HasFactory;

    protected $fillable = [
        'org_id',
        'name',
        'key_hash',
        'permissions',
        'rate_limit',
        'last_used_at',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'permissions' => 'array',
            'active' => 'boolean',
            'last_used_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'org_id');
    }
}
