<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EscalationChain extends Model
{
    use HasFactory;

    protected $fillable = [
        'site_id',
        'name',
        'levels',
    ];

    protected $casts = [
        'levels' => 'array',
    ];

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }
}
