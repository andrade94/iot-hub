<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, LogsActivity, Notifiable, TwoFactorAuthenticatable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'org_id',
        'phone',
        'whatsapp_phone',
        'has_app_access',
        'escalation_level',
        'privacy_accepted_at',
        'privacy_policy_version',
    ];

    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'has_app_access' => 'boolean',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'org_id');
    }

    public function sites(): BelongsToMany
    {
        return $this->belongsToMany(Site::class, 'user_sites')
            ->withPivot(['role', 'assigned_at', 'assigned_by']);
    }

    public function pushTokens(): HasMany
    {
        return $this->hasMany(PushToken::class);
    }

    /**
     * Get all sites this user can access.
     * org_admin and super_admin get all org sites; others get pivot sites only.
     */
    public function accessibleSites(): Collection
    {
        if ($this->isSuperAdmin()) {
            $orgId = session('current_org_id') ?? $this->org_id;

            return $orgId
                ? Site::where('org_id', $orgId)->get()
                : Site::all();
        }

        if ($this->hasRole('org_admin') && $this->org_id) {
            return Site::where('org_id', $this->org_id)->get();
        }

        return $this->sites()->get();
    }

    public function canAccessSite(int $siteId): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        if ($this->hasRole('org_admin') && $this->org_id) {
            return Site::where('id', $siteId)->where('org_id', $this->org_id)->exists();
        }

        return $this->sites()->where('sites.id', $siteId)->exists();
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super_admin');
    }

    public function belongsToOrg(int $orgId): bool
    {
        return $this->org_id === $orgId;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'email', 'org_id', 'phone'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $eventName) => "User {$eventName}");
    }
}
