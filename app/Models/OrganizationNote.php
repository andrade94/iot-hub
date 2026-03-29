<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizationNote extends Model
{
    use HasFactory;

    protected $fillable = [
        'org_id',
        'user_id',
        'note',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'org_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
