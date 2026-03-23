# Feature Spec: Alert Snooze & Quiet Hours

> Phase 11, Cycle 1 | Priority: P0 (Anti-Churn)
> Rules: BR-101→BR-105, SM-015, NT-021, NT-024, VL-016, VL-017, PM-005
> Screens: Alert Detail (modify), Profile Settings (modify)
> Status: MISSING — full build from scratch

---

## 1. Business Context

Alert fatigue is the #1 reason IoT monitoring projects fail. When alerts fire at 3am for LOW/MEDIUM issues, users silence WhatsApp → critical alerts stop reaching them → real incidents go unnoticed → client churns.

**Quiet hours** let users suppress non-critical alerts during off-hours. **Alert snooze** lets users say "I know about this, remind me later" without dismissing the alert. Together they prevent notification overload while ensuring critical alerts always get through.

## 2. User Stories

1. As a **site_viewer**, I want to set quiet hours (11pm-6am) so I don't get LOW/MEDIUM WhatsApp messages at night, but CRITICAL alerts still wake me up.
2. As a **site_manager**, I want to snooze an alert for 2 hours when I know a technician is already en route, so I stop getting re-notifications.
3. As a **technician**, I want to snooze an active alert while I'm working on the fix, so I don't keep getting "still active" pings.
4. As the **system**, I want to re-notify the user when a snoozed alert is still active after the snooze expires.
5. As the **system**, I want to deliver a quiet hours summary when the user's quiet period ends.

## 3. Business Rules

| Rule | Description |
|---|---|
| BR-101 | During quiet hours: LOW/MEDIUM suppressed (queued). CRITICAL/HIGH always delivered. |
| BR-102 | Snooze: suppress notifications for this user + this alert for N minutes. Re-notify on expiry if still active. |
| BR-103 | Quiet hours are per-USER. Fields: quiet_hours_start, quiet_hours_end, quiet_hours_tz on User. |
| BR-104 | Escalation chain overrides BOTH quiet hours and snooze. If alert reaches user's escalation level → deliver. |
| BR-105 | Snoozed alerts remain in alert list with unchanged status. Only notification delivery is suppressed. |

## 4. Data Model Changes

### Migration 1: `add_quiet_hours_to_users`

```php
Schema::table('users', function (Blueprint $table) {
    $table->time('quiet_hours_start')->nullable();
    $table->time('quiet_hours_end')->nullable();
    $table->string('quiet_hours_tz', 50)->nullable();
});
```

### Migration 2: `create_alert_snoozes_table`

```php
Schema::create('alert_snoozes', function (Blueprint $table) {
    $table->id();
    $table->foreignId('alert_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->timestamp('expires_at');
    $table->timestamps();

    $table->unique(['alert_id', 'user_id']); // one snooze per user per alert
});
```

### Model: `AlertSnooze`

```php
class AlertSnooze extends Model
{
    protected $fillable = ['alert_id', 'user_id', 'expires_at'];
    protected $casts = ['expires_at' => 'datetime'];

    public function alert(): BelongsTo { return $this->belongsTo(Alert::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }

    public function isExpired(): bool { return $this->expires_at->isPast(); }

    public function scopeActive(Builder $query): Builder {
        return $query->where('expires_at', '>', now());
    }
}
```

### User Model Changes

Add to `$fillable`: `quiet_hours_start`, `quiet_hours_end`, `quiet_hours_tz`

```php
public function isInQuietHours(): bool
{
    if (!$this->quiet_hours_start || !$this->quiet_hours_end) {
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

public function alertSnoozes(): HasMany
{
    return $this->hasMany(AlertSnooze::class);
}
```

### Alert Model Changes

Add relationship:

```php
public function snoozes(): HasMany
{
    return $this->hasMany(AlertSnooze::class);
}

public function isSnoozedFor(int $userId): bool
{
    return $this->snoozes()->where('user_id', $userId)->active()->exists();
}
```

## 5. API Endpoints

### POST `/alerts/{alert}/snooze`

```php
// AlertController::snooze
public function snooze(Request $request, Alert $alert)
{
    $this->authorize('acknowledge', $alert); // same permission as ack

    $validated = $request->validate([
        'duration_minutes' => 'required|integer|in:30,60,120,240,480',
    ]);

    AlertSnooze::updateOrCreate(
        ['alert_id' => $alert->id, 'user_id' => $request->user()->id],
        ['expires_at' => now()->addMinutes($validated['duration_minutes'])]
    );

    return back()->with('success', "Alert snoozed for {$validated['duration_minutes']} minutes.");
}
```

### DELETE `/alerts/{alert}/snooze`

```php
// AlertController::unsnooze
public function unsnooze(Request $request, Alert $alert)
{
    AlertSnooze::where('alert_id', $alert->id)
        ->where('user_id', $request->user()->id)
        ->delete();

    return back()->with('success', 'Snooze cancelled.');
}
```

### PATCH `/settings/profile` (extend existing)

Add quiet hours fields to `ProfileUpdateRequest` or validate inline:

```php
$request->validate([
    'quiet_hours_start' => 'nullable|date_format:H:i',
    'quiet_hours_end' => 'nullable|date_format:H:i|different:quiet_hours_start',
    'quiet_hours_tz' => 'nullable|timezone',
]);
```

## 6. AlertRouter Modifications

The key change: before sending a notification, check if the recipient has snoozed this alert or is in quiet hours.

```php
// In AlertRouter::route() — modify the per-user notification dispatch

private function shouldNotifyUser(User $user, Alert $alert): bool
{
    // BR-104: Escalation chain override — always notify if this is an escalation
    // (handled by caller: EscalationService passes $isEscalation flag)

    // BR-102: Check snooze
    if ($alert->isSnoozedFor($user->id)) {
        return false;
    }

    // BR-101: Check quiet hours
    if ($user->isInQuietHours()) {
        $severity = $alert->severity;
        // CRITICAL and HIGH always delivered during quiet hours
        if (in_array($severity, ['low', 'medium'])) {
            return false;
        }
    }

    return true;
}
```

Add this check in `dispatchToUser()` before calling `SendAlertNotification::dispatch()`.

## 7. Scheduled Job: CheckExpiredSnoozes

Runs every minute. Checks for expired snoozes where the alert is still active → re-notifies the user.

```php
// app/Jobs/CheckExpiredSnoozes.php

public function handle(): void
{
    $expired = AlertSnooze::where('expires_at', '<=', now())
        ->with(['alert', 'user'])
        ->get();

    foreach ($expired as $snooze) {
        // Delete the expired snooze
        $snooze->delete();

        // If alert is still active/acknowledged, re-notify (NT-024)
        if (in_array($snooze->alert->status, ['active', 'acknowledged'])) {
            SendAlertNotification::dispatch(
                $snooze->alert,
                $snooze->user,
                'push' // re-notify via push only, not full escalation
            );
        }
    }

    // Also: send quiet hours summary (NT-021) for users whose quiet hours just ended
    // Check users where quiet_hours_end matches current time (within 1 min window)
}
```

Register in `bootstrap/app.php`:

```php
$schedule->job(new CheckExpiredSnoozes)->everyMinute();
```

## 8. Frontend Changes

### Alert Detail (`pages/alerts/show.tsx`)

**Add after the Acknowledge/Resolve buttons (around line 90):**

```tsx
{/* Snooze button — visible when alert is active or acknowledged */}
{(alert.status === 'active' || alert.status === 'acknowledged') && (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
                <Clock className="mr-2 h-4 w-4" />
                {userSnooze ? 'Snoozed' : 'Snooze'}
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
            {[30, 60, 120, 240, 480].map((mins) => (
                <DropdownMenuItem
                    key={mins}
                    onClick={() => router.post(route('alerts.snooze', alert.id), {
                        duration_minutes: mins,
                    })}
                >
                    {mins < 60 ? `${mins} min` : `${mins / 60}h`}
                </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
    </DropdownMenu>
)}

{/* Snooze indicator */}
{userSnooze && (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-3 w-3" />
        Snoozed until {formatTime(userSnooze.expires_at)}
        <button
            className="text-xs underline hover:text-foreground"
            onClick={() => router.delete(route('alerts.unsnooze', alert.id))}
        >
            Cancel
        </button>
    </div>
)}
```

**Props addition:** Controller should pass `userSnooze` — the current user's active snooze for this alert (or null).

### Profile Settings (`pages/settings/profile.tsx`)

**Add new section after profile info (around line 142):**

A "Quiet Hours" card with:
- Toggle switch to enable/disable
- Two time pickers (start, end) — only visible when enabled
- Timezone select — defaults to org timezone
- Save button (PATCH to profile endpoint with quiet hours fields)

Use `useValidatedForm` with Zod schema (VL-017).

## 9. Edge Cases

| Case | Behavior |
|---|---|
| User snoozes alert, then alert auto-resolves before snooze expires | Snooze record orphaned — cleaned up by CheckExpiredSnoozes (delete, don't re-notify) |
| User snoozes, another user acknowledges | Snooze unaffected — it's per-user. The snoozed user still won't get notifications. |
| Quiet hours span midnight (23:00 → 06:00) | `isInQuietHours()` handles overnight with start > end check |
| User in escalation chain + quiet hours + MEDIUM alert | Quiet hours suppress it. BUT if alert escalates to their level, BR-104 override fires. |
| User in escalation chain + snooze + escalation reaches them | BR-104: escalation override. Deliver despite snooze. |
| User sets quiet hours but no timezone | Defaults to org's default_timezone, then UTC as fallback |
| Multiple snoozes by same user on same alert | `updateOrCreate` on (alert_id, user_id) — always one snooze per user per alert |
| Alert detail page for snoozed alert | Shows snooze badge with expiry time + "Cancel" link. Alert status unchanged. |

## 10. Acceptance Criteria

- [ ] User can set quiet hours (start, end, timezone) in profile settings
- [ ] During quiet hours: LOW/MEDIUM notifications suppressed, CRITICAL/HIGH delivered
- [ ] User can snooze an alert for 30min/1h/2h/4h/8h from alert detail page
- [ ] Snoozed alert shows indicator badge with expiry time + cancel option
- [ ] When snooze expires and alert still active: user re-notified via push
- [ ] Escalation chain deliveries override both quiet hours and snooze (BR-104)
- [ ] Alert list shows same status regardless of snooze (BR-105)
- [ ] Quiet hours summary sent when quiet period ends (NT-021)
- [ ] All roles can snooze alerts they have access to
- [ ] All roles can set their own quiet hours

## 11. Build Order

```
1. MIGRATION: add_quiet_hours_to_users (quiet_hours_start, end, tz)
2. MIGRATION: create_alert_snoozes_table
3. MODEL: AlertSnooze (fillable, casts, relationships, scopes)
4. MODEL: User — add quiet hours fields + isInQuietHours() + alertSnoozes()
5. MODEL: Alert — add snoozes() relationship + isSnoozedFor()
6. FACTORY: AlertSnoozeFactory
7. SERVICE: Modify AlertRouter — add shouldNotifyUser() check
8. CONTROLLER: AlertController — add snooze() + unsnooze() methods
9. CONTROLLER: Extend profile update to accept quiet hours fields
10. ROUTES: POST/DELETE /alerts/{alert}/snooze
11. JOB: CheckExpiredSnoozes (every minute)
12. FRONTEND: Snooze button + indicator on Alert Detail
13. FRONTEND: Quiet Hours section on Profile Settings
14. TESTS: AlertSnoozeTest (snooze/unsnooze, expiry re-notify, escalation override)
15. TESTS: QuietHoursTest (suppression, overnight range, CRITICAL override)
```

## 12. QA Test Plan

### Test Scenarios

1. **Happy path — snooze:** Log in as site_manager → open active alert → click Snooze → select 2h → verify snooze badge appears → verify no re-notification for 2h → after 2h, verify push notification re-sent
2. **Happy path — quiet hours:** Set quiet hours 23:00-06:00 → trigger LOW alert at 01:00 → verify no notification → trigger CRITICAL alert at 01:00 → verify notification delivered
3. **Permission check:** All 5 roles can snooze alerts on their accessible sites
4. **Escalation override:** User has quiet hours active → escalation chain reaches their level → verify notification delivered despite quiet hours
5. **Cancel snooze:** Snooze an alert → click Cancel → verify snooze removed → trigger re-notification immediately
6. **Overnight quiet hours:** Set 23:00-06:00 → test at 23:30 (in quiet) → test at 06:30 (not in quiet)
7. **Multiple users snooze same alert:** User A snoozes → User B snoozes → verify independent tracking
8. **Snooze expired + alert resolved:** Snooze alert → resolve alert before snooze expires → verify no re-notification

### Regression Risk
- AlertRouter changes could affect existing notification delivery — run full AlertEngineTest suite
- Profile settings form change could break existing profile update — run ProfileUpdateTest
- Scheduled job registration could conflict with existing schedule — verify bootstrap/app.php

---

*Feature spec generated 2026-03-23 by Phase 7. Ready for implementation.*
