<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BillingProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'org_id',
        'name',
        'rfc',
        'razon_social',
        'regimen_fiscal',
        'direccion_fiscal',
        'uso_cfdi',
        'email_facturacion',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'direccion_fiscal' => 'array',
            'is_default' => 'boolean',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'org_id');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }
}
