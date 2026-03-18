<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntegrationConfig extends Model
{
    use HasFactory;

    protected $fillable = [
        'org_id',
        'type',
        'config',
        'schedule_cron',
        'last_export_at',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'config' => 'encrypted:array',
            'active' => 'boolean',
            'last_export_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'org_id');
    }
}
