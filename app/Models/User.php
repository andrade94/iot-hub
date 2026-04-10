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
        'quiet_hours_start',
        'quiet_hours_end',
        'quiet_hours_tz',
        'notify_whatsapp',
        'notify_push',
        'notify_email',
        'notify_min_severity',
        'deactivated_at',
        'locale',
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
            'notify_whatsapp' => 'boolean',
            'notify_push' => 'boolean',
            'notify_email' => 'boolean',
            'deactivated_at' => 'datetime',
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
            // If the super admin explicitly has a current_org_id key in session,
            // respect it even if null ("All Organizations" = see everything).
            // If the key is NOT set at all, default to their own org.
            if (session()->has('current_org_id')) {
                $orgId = session('current_org_id');

                return $orgId
                    ? Site::where('org_id', $orgId)->get()
                    : Site::all();
            }

            return $this->org_id
                ? Site::where('org_id', $this->org_id)->get()
                : Site::all();
        }

        if ($this->hasRole('client_org_admin') && $this->org_id) {
            return Site::where('org_id', $this->org_id)->get();
        }

        return $this->sites()->get();
    }

    public function canAccessSite(int $siteId): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        if ($this->hasRole('client_org_admin') && $this->org_id) {
            return Site::where('id', $siteId)->where('org_id', $this->org_id)->exists();
        }

        return $this->sites()->where('sites.id', $siteId)->exists();
    }

    /**
     * Get the user's preferred locale for notifications.
     * Used by Laravel's notification system to send emails in the right language.
     */
    public function preferredLocale(): string
    {
        return $this->locale ?? 'en';
    }

    public function getLocale(): ?string
    {
        return $this->locale;
    }

    public function setLocale(string $locale): void
    {
        $this->locale = $locale;
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super_admin');
    }

    public function belongsToOrg(int $orgId): bool
    {
        return $this->org_id === $orgId;
    }

    public function isDeactivated(): bool
    {
        return $this->deactivated_at !== null;
    }

    public function scopeActive($query)
    {
        return $query->whereNull('deactivated_at');
    }

    public function wantsChannel(string $channel): bool
    {
        return match ($channel) {
            'whatsapp' => $this->notify_whatsapp ?? true,
            'push' => $this->notify_push ?? true,
            'email' => $this->notify_email ?? true,
            default => true,
        };
    }

    public function wantsSeverity(string $severity): bool
    {
        $minSeverity = $this->notify_min_severity ?? 'low';
        $levels = ['low' => 0, 'medium' => 1, 'high' => 2, 'critical' => 3];

        return ($levels[$severity] ?? 0) >= ($levels[$minSeverity] ?? 0);
    }

    public function assignedWorkOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class, 'assigned_to');
    }

    public function alertSnoozes(): HasMany
    {
        return $this->hasMany(AlertSnooze::class);
    }

    public function isInQuietHours(): bool
    {
        if (! $this->quiet_hours_start || ! $this->quiet_hours_end) {
            return false;
        }

        $tz = $this->quiet_hours_tz ?? $this->organization?->default_timezone ?? 'UTC';
        $now = now($tz);
        $start = $now->copy()->setTimeFromTimeString($this->quiet_hours_start);
        $end = $now->copy()->setTimeFromTimeString($this->quiet_hours_end);

        // Handle overnight ranges (e.g., 23:00 → 06:00)
        if ($start->gt($end)) {
            return $now->gte($start) || $now->lte($end);
        }

        return $now->between($start, $end);
    }

    public function hasAlertSnoozed(int $alertId): bool
    {
        return $this->alertSnoozes()->where('alert_id', $alertId)->active()->exists();
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
