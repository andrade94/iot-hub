# Phase 10 Sprint 2 — Feature Implementation Specs

> **Generated:** 2026-03-20 | Phase 7 --focus phase-10-sprint-2
> **Scope:** 4 features — Alert Suppression Chain + Alert Analytics
> **Theme:** All 3 suppression features modify `RuleEvaluator` — build together to avoid rework
> **Refs:** SYSTEM_BEHAVIOR_SPEC.md (BR-067-082), WORKFLOW_UX_DESIGN.md (WF-018-020, WF-016)

---

## Build Order

```
Feature 1: Maintenance Windows        (~8h)  — model + CRUD + RuleEvaluator suppression
Feature 2: Mass Offline Detection     (~6h)  — CheckDeviceHealth enhancement + site-level alerts
Feature 3: Upstream Outage Declaration (~8h)  — model + Command Center UI + global suppression
Feature 4: Alert Analytics Dashboard   (~8h)  — service + new page with charts

Dependency chain:
  Feature 1 adds MaintenanceWindow::isActive() check to RuleEvaluator
  Feature 2 adds mass offline grouping to CheckDeviceHealth (independent of 1)
  Feature 3 adds OutageDeclaration global suppression to RuleEvaluator (after 1)
  Feature 4 is fully independent — analytics queries only

Final RuleEvaluator suppression chain (after Sprint 2):
  1. Check outage declaration (BR-080) → if active, suppress ALL offline alerts
  2. Check maintenance window (BR-073) → if active for zone, suppress zone alerts
  3. Check defrost suppression (BR-014) → existing, cold-chain only
  4. Normal evaluation continues

Recommended schedule:
  Day 1: Feature 1 (maintenance windows — migration, model, controller, RuleEvaluator, page)
  Day 2: Feature 2 (mass offline) + Feature 3 backend (outage model, controller, routes)
  Day 3: Feature 3 frontend (Command Center UI) + Feature 4 (alert analytics page)
```

---

## Feature 1: Maintenance Windows

**Gap:** BR-073→BR-076 (CRITICAL) — MISSING
**Why:** Sites have scheduled maintenance (cooler cleaning, defrost tests). Without suppression, every maintenance generates false alerts → alert fatigue → people ignore real alerts.

### 1a. Migration

**File:** `database/migrations/2026_03_20_100001_create_maintenance_windows_table.php`

```php
public function up(): void
{
    Schema::create('maintenance_windows', function (Blueprint $table) {
        $table->id();
        $table->foreignId('site_id')->constrained()->cascadeOnDelete();
        $table->string('zone')->nullable(); // null = entire site
        $table->string('title');
        $table->string('recurrence')->default('once'); // once, daily, weekly, monthly
        $table->unsignedTinyInteger('day_of_week')->nullable(); // 0=Sun..6=Sat (for weekly)
        $table->time('start_time');
        $table->unsignedSmallInteger('duration_minutes')->default(60);
        $table->boolean('suppress_alerts')->default(true);
        $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
        $table->timestamps();

        $table->index(['site_id', 'zone']);
    });
}
```

### 1b. MaintenanceWindow Model

**File:** `app/Models/MaintenanceWindow.php` (NEW)

```php
<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class MaintenanceWindow extends Model
{
    use LogsActivity;

    protected $fillable = [
        'site_id', 'zone', 'title', 'recurrence', 'day_of_week',
        'start_time', 'duration_minutes', 'suppress_alerts', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'start_time' => 'string', // H:i format
            'duration_minutes' => 'integer',
            'day_of_week' => 'integer',
            'suppress_alerts' => 'boolean',
        ];
    }

    /**
     * Check if this window is currently active (BR-073).
     * Accounts for recurrence pattern and site timezone.
     */
    public function isActiveNow(?string $timezone = null): bool
    {
        if (! $this->suppress_alerts) {
            return false;
        }

        $tz = $timezone ?? $this->site?->timezone ?? config('app.timezone');
        $now = Carbon::now($tz);
        $today = $now->dayOfWeek; // 0=Sun..6=Sat

        // Check recurrence matches today
        $matchesToday = match ($this->recurrence) {
            'once' => true, // Always check (one-time windows managed by cleanup)
            'daily' => true,
            'weekly' => $this->day_of_week === $today,
            'monthly' => $now->day === 1, // Monthly = 1st of month
            default => false,
        };

        if (! $matchesToday) {
            return false;
        }

        // Check time window
        $start = Carbon::parse($this->start_time, $tz);
        $end = $start->copy()->addMinutes($this->duration_minutes);

        // Normalize to today
        $startToday = $now->copy()->setTimeFrom($start);
        $endToday = $startToday->copy()->addMinutes($this->duration_minutes);

        return $now->between($startToday, $endToday);
    }

    /**
     * Static check: is there an active maintenance window for this site+zone?
     * Called from RuleEvaluator before alert evaluation.
     */
    public static function isActiveForZone(int $siteId, ?string $zone, ?string $timezone = null): bool
    {
        $windows = static::where('site_id', $siteId)
            ->where('suppress_alerts', true)
            ->where(function ($q) use ($zone) {
                $q->whereNull('zone') // site-wide windows
                  ->orWhere('zone', $zone); // zone-specific windows
            })
            ->get();

        return $windows->contains(fn ($w) => $w->isActiveNow($timezone));
    }

    // --- Relationships ---

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // --- Scopes ---

    public function scopeForSite(mixed $query, int $siteId): mixed
    {
        return $query->where('site_id', $siteId);
    }

    // --- Activity Log ---

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['title', 'zone', 'recurrence', 'start_time', 'duration_minutes', 'suppress_alerts'])
            ->logOnlyDirty();
    }
}
```

### 1c. RuleEvaluator Integration

**File:** `app/Services/RulesEngine/RuleEvaluator.php`
**Change:** Add maintenance window check at the TOP of `evaluateRule()`, before any condition evaluation.

In `evaluateRule()` method, after fetching the rule and before checking conditions, add:

```php
// Maintenance window suppression (BR-073)
if (MaintenanceWindow::isActiveForZone($device->site_id, $device->zone, $device->site?->timezone)) {
    return; // Skip evaluation entirely during maintenance
}
```

Add `use App\Models\MaintenanceWindow;` to imports.

### 1d. Permission Seeder

Add `'manage maintenance windows'` to the permissions array and assign to super_admin (auto), org_admin, and site_manager.

### 1e. MaintenanceWindowController

**File:** `app/Http/Controllers/MaintenanceWindowController.php` (NEW)

Follow the `ComplianceCalendarController` pattern:
- `index()` — list windows for user's accessible sites, return grouped by site
- `store()` — validate + create with `created_by` = auth user
- `update()` — validate + update
- `destroy()` — delete with confirmation

### 1f. Routes

**File:** `routes/web.php` — add in the settings group:

```php
Route::prefix('settings/maintenance-windows')->name('maintenance-windows.')->group(function () {
    Route::get('/', [MaintenanceWindowController::class, 'index'])->name('index');
    Route::post('/', [MaintenanceWindowController::class, 'store'])->name('store');
    Route::put('{maintenanceWindow}', [MaintenanceWindowController::class, 'update'])->name('update');
    Route::delete('{maintenanceWindow}', [MaintenanceWindowController::class, 'destroy'])->name('destroy');
});
```

### 1g. Frontend Page

**File:** `resources/js/pages/settings/maintenance-windows/index.tsx` (NEW)

Follow the compliance calendar page pattern (spec 4.53 from WORKFLOW_UX_DESIGN.md):
- AppLayout wrapper
- Table with columns: Title, Site, Zone, Schedule (human-readable), Duration, Suppress toggle, Actions
- Create/Edit dialog with: site_id, zone, title, recurrence, start_time, duration_minutes, suppress_alerts
- `useValidatedForm` with Zod schema
- "Active now" badge on rows where window is currently active
- EmptyState when no windows configured

### 1h. Navigation

**File:** `resources/js/config/navigation.ts` — add to Administration section:

```tsx
{
    title: 'Maintenance Windows',
    href: '/settings/maintenance-windows',
    icon: Wrench,
    tooltip: 'Schedule maintenance windows',
    requiredPermission: 'manage maintenance windows',
},
```

### 1i. Tests

**File:** `tests/Feature/Http/MaintenanceWindowTest.php` (NEW)

```
test('site_manager can create maintenance window')
test('maintenance window suppresses alerts during active period')
test('maintenance window does not suppress outside time window')
test('zone-specific window only suppresses that zone')
test('site-wide window (zone=null) suppresses all zones')
test('weekly recurrence only active on configured day')
test('site_viewer cannot manage maintenance windows')
test('guest is redirected')
```

**File:** `tests/Feature/Services/MaintenanceWindowSuppressionTest.php` (NEW)

```
test('RuleEvaluator skips evaluation during active maintenance window')
test('RuleEvaluator evaluates normally when no active window')
test('disabled window (suppress_alerts=false) does not suppress')
```

### 1j. Acceptance Criteria

- [ ] `maintenance_windows` table created with all fields
- [ ] `MaintenanceWindow::isActiveForZone()` correctly checks time + recurrence + zone
- [ ] `RuleEvaluator` skips evaluation when maintenance window active
- [ ] CRUD page at `/settings/maintenance-windows` with dialog form
- [ ] Permission `manage maintenance windows` gates access
- [ ] "Active now" indicator on rows during active window
- [ ] Activity log tracks changes

---

## Feature 2: Mass Offline Detection

**Gap:** BR-077→BR-079 (CRITICAL) — MISSING
**Why:** When a gateway dies, all 15 sensors go offline. Current behavior creates 15 individual work orders. Correct: 1 site-level alert, suppress individual alerts.

### 2a. MassOfflineDetector Service

**File:** `app/Services/Alerts/MassOfflineDetector.php` (NEW)

```php
<?php

namespace App\Services\Alerts;

use App\Models\Alert;
use App\Models\Device;
use App\Models\Gateway;
use App\Models\Site;
use Illuminate\Support\Facades\Log;

class MassOfflineDetector
{
    /**
     * Check if a site is experiencing mass offline (>50% devices offline in 5 min).
     * Returns true if mass offline detected (caller should suppress individual alerts).
     */
    public function check(Site $site): bool
    {
        $totalDevices = Device::where('site_id', $site->id)
            ->whereIn('status', ['active', 'offline'])
            ->count();

        if ($totalDevices === 0) {
            return false;
        }

        $offlineDevices = Device::where('site_id', $site->id)
            ->where('status', 'offline')
            ->where(function ($q) {
                $q->whereNull('last_reading_at')
                  ->orWhere('last_reading_at', '<', now()->subMinutes(5));
            })
            ->count();

        $offlinePct = ($offlineDevices / $totalDevices) * 100;

        if ($offlinePct <= 50) {
            return false;
        }

        // Check gateway first (BR-078)
        $gatewayOffline = $this->checkGatewayStatus($site);

        // Create ONE site-level alert instead of per-device alerts
        $this->createSiteLevelAlert($site, $offlineDevices, $totalDevices, $gatewayOffline);

        return true;
    }

    /**
     * Check if gateway is the root cause (BR-078).
     */
    private function checkGatewayStatus(Site $site): bool
    {
        return Gateway::where('site_id', $site->id)
            ->where(function ($q) {
                $q->whereNull('last_seen_at')
                  ->orWhere('last_seen_at', '<', now()->subMinutes(30));
            })
            ->exists();
    }

    /**
     * Create a single site-level alert for mass offline event (BR-077).
     */
    private function createSiteLevelAlert(Site $site, int $offline, int $total, bool $gatewayOffline): void
    {
        // Avoid duplicate mass offline alerts (cooldown: 1 per hour per site)
        $existing = Alert::where('site_id', $site->id)
            ->where('data->type', 'mass_offline')
            ->where('status', 'active')
            ->where('triggered_at', '>=', now()->subHour())
            ->exists();

        if ($existing) {
            return;
        }

        $message = $gatewayOffline
            ? "Gateway offline at {$site->name} — {$offline} of {$total} devices affected"
            : "Possible power outage at {$site->name} — {$offline} of {$total} devices offline";

        Alert::create([
            'site_id' => $site->id,
            'severity' => 'critical',
            'status' => 'active',
            'triggered_at' => now(),
            'data' => [
                'type' => 'mass_offline',
                'rule_name' => $gatewayOffline ? 'Gateway Offline' : 'Mass Offline Detection',
                'device_name' => $site->name,
                'metric' => 'offline_devices',
                'value' => $offline,
                'threshold' => $total,
                'condition' => 'above',
                'message' => $message,
                'gateway_offline' => $gatewayOffline,
            ],
        ]);

        Log::warning("MassOfflineDetector: {$message}");
    }

    /**
     * Cross-site pattern: >3 sites offline simultaneously → upstream outage (BR-079).
     */
    public function checkCrossSitePattern(int $orgId): bool
    {
        $sitesWithMassOffline = Alert::whereHas('site', fn ($q) => $q->where('org_id', $orgId))
            ->where('data->type', 'mass_offline')
            ->where('status', 'active')
            ->where('triggered_at', '>=', now()->subMinutes(10))
            ->distinct('site_id')
            ->count('site_id');

        return $sitesWithMassOffline >= 3;
    }
}
```

### 2b. CheckDeviceHealth Integration

**File:** `app/Jobs/CheckDeviceHealth.php`
**Change:** Add mass offline check BEFORE individual device offline processing.

In `checkOfflineDevices()`, before marking individual devices offline:

```php
// Mass offline detection (BR-077): check per-site before individual alerts
$massDetector = app(MassOfflineDetector::class);
$affectedSites = Device::where('status', 'active')
    ->where(fn ($q) => $q->whereNull('last_reading_at')->orWhere('last_reading_at', '<', now()->subMinutes(15)))
    ->pluck('site_id')
    ->unique();

$massOfflineSites = collect();
foreach ($affectedSites as $siteId) {
    $site = Site::find($siteId);
    if ($site && $massDetector->check($site)) {
        $massOfflineSites->push($siteId);
    }
}

// For mass-offline sites, still mark devices offline but DON'T create individual work orders
$offlineDevices = Device::where('status', 'active')
    ->where(fn ($q) => $q->whereNull('last_reading_at')->orWhere('last_reading_at', '<', now()->subMinutes(15)))
    ->get();

foreach ($offlineDevices as $device) {
    $device->update(['status' => 'offline']);

    // Only create individual work orders if NOT a mass offline site
    if (! $massOfflineSites->contains($device->site_id)) {
        if ($device->last_reading_at && $device->last_reading_at->lt(now()->subHours(2))) {
            CreateWorkOrder::dispatchIfNotDuplicate($device, 'offline');
        }
    }
}
```

### 2c. Tests

```
test('mass offline detected when >50% devices offline at site')
test('creates single site-level alert instead of per-device alerts')
test('checks gateway status first when mass offline')
test('suppresses individual work orders during mass offline')
test('does not trigger for <50% offline')
test('cooldown prevents duplicate mass offline alerts')
test('cross-site pattern detected with 3+ sites')
```

### 2d. Acceptance Criteria

- [ ] >50% devices offline at site → ONE "Mass Offline" alert created
- [ ] Gateway offline → alert says "Gateway Offline" not "Mass Offline"
- [ ] Individual device work orders suppressed during mass offline
- [ ] Devices still marked offline (status update happens)
- [ ] 1-hour cooldown prevents duplicate mass offline alerts
- [ ] Cross-site pattern detection (>3 sites = upstream signal)

---

## Feature 3: Upstream Outage Declaration

**Gap:** BR-080→BR-082, SM-013, NT-015, NT-016 (CRITICAL) — MISSING
**Why:** When ChirpStack Cloud has a 1-hour outage, ALL devices across ALL sites go offline → hundreds of false work orders. super_admin needs a "Declare Outage" button.

### 3a. Migration

**File:** `database/migrations/2026_03_20_100002_create_outage_declarations_table.php`

```php
public function up(): void
{
    Schema::create('outage_declarations', function (Blueprint $table) {
        $table->id();
        $table->text('reason');
        $table->json('affected_services'); // ['chirpstack', 'twilio', 'mqtt', ...]
        $table->string('status')->default('active'); // active, resolved
        $table->foreignId('declared_by')->constrained('users');
        $table->timestamp('declared_at');
        $table->unsignedBigInteger('resolved_by')->nullable();
        $table->timestamp('resolved_at')->nullable();
        $table->timestamps();

        $table->foreign('resolved_by')->references('id')->on('users')->nullOnDelete();
        $table->index('status');
    });
}
```

### 3b. OutageDeclaration Model

**File:** `app/Models/OutageDeclaration.php` (NEW)

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OutageDeclaration extends Model
{
    protected $fillable = [
        'reason', 'affected_services', 'status',
        'declared_by', 'declared_at', 'resolved_by', 'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'affected_services' => 'array',
            'declared_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    // --- State Machine (SM-013: active → resolved) ---

    public function resolve(int $userId): self
    {
        if ($this->status !== 'active') {
            throw new \InvalidArgumentException('Only active outages can be resolved.');
        }

        $this->update([
            'status' => 'resolved',
            'resolved_by' => $userId,
            'resolved_at' => now(),
        ]);

        return $this;
    }

    /**
     * Check if there's currently an active outage declaration (BR-080).
     */
    public static function isActive(): bool
    {
        return static::where('status', 'active')->exists();
    }

    /**
     * Get the current active outage, if any.
     */
    public static function current(): ?self
    {
        return static::where('status', 'active')->latest('declared_at')->first();
    }

    // --- Relationships ---

    public function declaredByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'declared_by');
    }

    public function resolvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
```

### 3c. RuleEvaluator Integration

**File:** `app/Services/RulesEngine/RuleEvaluator.php`
**Change:** Add outage check as the FIRST check in `evaluate()` method, before iterating rules.

```php
// Upstream outage suppression (BR-080) — suppress ALL alert evaluation platform-wide
if (OutageDeclaration::isActive()) {
    return;
}
```

Add `use App\Models\OutageDeclaration;` to imports.

**Also** add outage check to `CheckDeviceHealth::handle()` — skip work order creation during outage:

```php
// Skip individual work order creation during declared outage
if (OutageDeclaration::isActive()) {
    // Still mark devices offline for status tracking, but don't create WOs
    $skipWorkOrders = true;
}
```

### 3d. HandleInertiaRequests — Share Outage Banner

**File:** `app/Http/Middleware/HandleInertiaRequests.php`
**Change:** Add to the shared data array:

```php
'active_outage' => OutageDeclaration::isActive()
    ? OutageDeclaration::current()?->only(['id', 'reason', 'affected_services', 'declared_at'])
    : null,
```

### 3e. CommandCenterController — Outage Endpoints

**File:** `app/Http/Controllers/CommandCenterController.php`
**Add methods:**

```php
public function declareOutage(Request $request)
{
    $validated = $request->validate([
        'reason' => 'required|string|min:5|max:500',
        'affected_services' => 'required|array|min:1',
        'affected_services.*' => 'string|in:chirpstack,twilio,mqtt,redis,database,other',
    ]);

    OutageDeclaration::create([
        ...$validated,
        'status' => 'active',
        'declared_by' => $request->user()->id,
        'declared_at' => now(),
    ]);

    return back()->with('success', 'Outage declared. All offline alerts suppressed platform-wide.');
}

public function resolveOutage(Request $request)
{
    $outage = OutageDeclaration::where('status', 'active')->firstOrFail();
    $outage->resolve($request->user()->id);

    return back()->with('success', 'Outage resolved. Normal monitoring resumed.');
}
```

### 3f. Routes

**File:** `routes/web.php` — add in the command center group:

```php
Route::post('command-center/outage', [CommandCenterController::class, 'declareOutage'])
    ->name('command-center.outage.declare');
Route::delete('command-center/outage', [CommandCenterController::class, 'resolveOutage'])
    ->name('command-center.outage.resolve');
```

### 3g. Frontend — Command Center Outage Banner

**File:** `resources/js/pages/command-center/index.tsx`
**Add:** Outage banner at the very top (above KPI cards), and "Declare Outage" button in header.

**Outage banner** (when `active_outage` exists in shared props):
```tsx
{activeOutage && (
    <div className="flex items-center justify-between rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
        <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
                <p className="font-medium text-red-800 dark:text-red-200">
                    Platform outage declared
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                    {activeOutage.reason} — since {formatTime(activeOutage.declared_at)}
                </p>
            </div>
        </div>
        <Button variant="destructive" size="sm" onClick={() => router.delete('/command-center/outage')}>
            End Outage
        </Button>
    </div>
)}
```

**Declare Outage button** (in header, when no active outage):
```tsx
{!activeOutage && (
    <Button variant="destructive" size="sm" onClick={() => setShowOutageDialog(true)}>
        Declare Outage
    </Button>
)}
```

**Outage dialog:** form with `reason` textarea + `affected_services` checkbox group.

### 3h. Tests

```
test('super_admin can declare outage')
test('outage suppresses all alert evaluation')
test('outage suppresses work order creation')
test('super_admin can resolve outage')
test('non-super_admin cannot declare outage')
test('only one outage can be active at a time')
test('outage banner shared via Inertia')
test('resolved outage resumes normal monitoring')
```

### 3i. Acceptance Criteria

- [ ] `outage_declarations` table created
- [ ] `OutageDeclaration::isActive()` check in RuleEvaluator (first check, before all rules)
- [ ] `OutageDeclaration::isActive()` check in CheckDeviceHealth (skip work orders)
- [ ] `HandleInertiaRequests` shares `active_outage` prop globally
- [ ] Command Center shows "Declare Outage" button (super_admin only)
- [ ] Active outage shows red banner with "End Outage" button
- [ ] Only one active outage at a time
- [ ] Resolving outage resumes normal monitoring

---

## Feature 4: Alert Analytics & Tuning Dashboard

**Gap:** BR-067, BR-068 (HIGH) — MISSING
**Why:** Alert fatigue is the #1 reason IoT monitoring projects fail. Clients need visibility into which rules are noisy and how fast alerts are resolved.

### 4a. AlertAnalyticsService

**File:** `app/Services/Alerts/AlertAnalyticsService.php` (NEW)

```php
<?php

namespace App\Services\Alerts;

use App\Models\Alert;
use App\Models\AlertRule;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AlertAnalyticsService
{
    public function __construct(
        private ?int $orgId = null,
        private ?int $siteId = null,
        private int $days = 30,
    ) {}

    /**
     * Summary KPI cards.
     */
    public function getSummary(): array
    {
        $query = $this->baseQuery();

        $total = (clone $query)->count();
        $dismissed = (clone $query)->where('resolution_type', 'dismissed')->count();
        $autoResolved = (clone $query)->where('resolution_type', 'auto')->count();
        $acknowledged = (clone $query)->whereNotNull('acknowledged_at')->count();

        $avgResponseMinutes = (clone $query)
            ->whereNotNull('acknowledged_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, triggered_at, acknowledged_at)) as avg_min')
            ->value('avg_min');

        // SQLite fallback for tests
        if ($avgResponseMinutes === null) {
            $avgResponseMinutes = (clone $query)
                ->whereNotNull('acknowledged_at')
                ->selectRaw("AVG((JULIANDAY(acknowledged_at) - JULIANDAY(triggered_at)) * 1440) as avg_min")
                ->value('avg_min');
        }

        return [
            'total_alerts' => $total,
            'dismissal_rate' => $total > 0 ? round(($dismissed / $total) * 100, 1) : 0,
            'avg_response_minutes' => $avgResponseMinutes ? round($avgResponseMinutes, 0) : null,
            'auto_resolved_pct' => $total > 0 ? round(($autoResolved / $total) * 100, 1) : 0,
        ];
    }

    /**
     * Top 10 noisiest rules by alert count (BR-067).
     */
    public function getNoisiestRules(int $limit = 10): Collection
    {
        return Alert::query()
            ->join('alert_rules', 'alerts.rule_id', '=', 'alert_rules.id')
            ->when($this->siteId, fn ($q) => $q->where('alerts.site_id', $this->siteId))
            ->when($this->orgId, fn ($q) => $q->whereHas('site', fn ($sq) => $sq->where('org_id', $this->orgId)))
            ->where('alerts.triggered_at', '>=', now()->subDays($this->days))
            ->groupBy('alerts.rule_id', 'alert_rules.name', 'alert_rules.site_id')
            ->selectRaw('alerts.rule_id, alert_rules.name as rule_name, alert_rules.site_id, COUNT(*) as alert_count')
            ->selectRaw("SUM(CASE WHEN alerts.resolution_type = 'dismissed' THEN 1 ELSE 0 END) as dismissed_count")
            ->orderByDesc('alert_count')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'rule_id' => $row->rule_id,
                'rule_name' => $row->rule_name,
                'site_id' => $row->site_id,
                'alert_count' => $row->alert_count,
                'dismissal_rate' => $row->alert_count > 0
                    ? round(($row->dismissed_count / $row->alert_count) * 100, 1) : 0,
            ]);
    }

    /**
     * Alert trend data (daily counts over period).
     */
    public function getTrend(): Collection
    {
        return $this->baseQuery()
            ->selectRaw("DATE(triggered_at) as date, COUNT(*) as count")
            ->groupByRaw("DATE(triggered_at)")
            ->orderBy('date')
            ->pluck('count', 'date');
    }

    /**
     * Resolution breakdown (auto vs manual vs work_order vs dismissed).
     */
    public function getResolutionBreakdown(): array
    {
        $query = $this->baseQuery()->whereNotNull('resolved_at');

        return [
            'auto' => (clone $query)->where('resolution_type', 'auto')->count(),
            'manual' => (clone $query)->where('resolution_type', 'manual')->count(),
            'work_order' => (clone $query)->where('resolution_type', 'work_order')->count(),
            'dismissed' => (clone $query)->where('resolution_type', 'dismissed')->count(),
        ];
    }

    /**
     * Suggested tuning: rules firing >50x/week (BR-068).
     */
    public function getSuggestedTuning(): Collection
    {
        $weeklyThreshold = 50;

        return $this->getNoisiestRules(20)
            ->filter(fn ($rule) => ($rule['alert_count'] / max($this->days / 7, 1)) >= $weeklyThreshold)
            ->map(fn ($rule) => [
                ...$rule,
                'weekly_rate' => round($rule['alert_count'] / max($this->days / 7, 1), 0),
                'suggestion' => "Fires ~{$rule['alert_count']}x in {$this->days}d — consider raising threshold",
            ]);
    }

    private function baseQuery()
    {
        return Alert::query()
            ->when($this->siteId, fn ($q) => $q->where('site_id', $this->siteId))
            ->when($this->orgId, fn ($q) => $q->whereHas('site', fn ($sq) => $sq->where('org_id', $this->orgId)))
            ->where('triggered_at', '>=', now()->subDays($this->days));
    }
}
```

### 4b. AlertAnalyticsController

**File:** `app/Http/Controllers/AlertAnalyticsController.php` (NEW)

```php
<?php

namespace App\Http\Controllers;

use App\Services\Alerts\AlertAnalyticsService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AlertAnalyticsController extends Controller
{
    public function __invoke(Request $request)
    {
        $this->authorize('viewAny', \App\Models\Alert::class);

        $days = (int) $request->input('days', 30);
        $siteId = $request->input('site_id');

        $user = $request->user();
        $orgId = $user->hasRole('super_admin') ? null : $user->org_id;

        $service = new AlertAnalyticsService(
            orgId: $orgId,
            siteId: $siteId ? (int) $siteId : null,
            days: $days,
        );

        return Inertia::render('analytics/alerts', [
            'summary' => $service->getSummary(),
            'noisiest_rules' => $service->getNoisiestRules(),
            'trend' => $service->getTrend(),
            'resolution_breakdown' => $service->getResolutionBreakdown(),
            'suggested_tuning' => $service->getSuggestedTuning(),
            'sites' => $user->accessibleSites()->map(fn ($s) => ['id' => $s->id, 'name' => $s->name]),
            'filters' => [
                'days' => $days,
                'site_id' => $siteId,
            ],
        ]);
    }
}
```

### 4c. Route

```php
Route::get('analytics/alerts', AlertAnalyticsController::class)->name('analytics.alerts');
```

### 4d. Frontend Page

**File:** `resources/js/pages/analytics/alerts.tsx` (NEW)

Per spec 4.52 from WORKFLOW_UX_DESIGN.md — dashboard pattern with:
- 4 KPI summary cards (total alerts, dismissal rate, avg response time, auto-resolved %)
- Noisiest rules table (top 10 with "Tune" link → rule detail)
- Trend chart (Recharts area chart, 30d/90d toggle)
- Resolution breakdown (donut chart)
- Suggested tuning cards (rules >50x/week with recommendation)
- Site filter dropdown + period toggle

### 4e. Navigation

**File:** `resources/js/config/navigation.ts` — add Analytics section:

```tsx
{
    title: 'Analytics',
    items: [
        {
            title: 'Alert Tuning',
            href: '/analytics/alerts',
            icon: BarChart3,
            tooltip: 'Alert analytics & tuning',
            requiredPermission: 'view alert analytics',
        },
    ],
},
```

### 4f. Permission

Add `'view alert analytics'` to permissions array. Assign to super_admin, org_admin, site_manager.

### 4g. Tests

```
test('org_admin can view alert analytics')
test('site_viewer cannot view alert analytics')
test('summary returns correct counts')
test('noisiest rules sorted by alert count')
test('dismissal rate calculated correctly')
test('suggested tuning flags rules >50x/week')
test('site filter scopes data correctly')
test('period filter changes date range')
```

### 4h. Acceptance Criteria

- [ ] `/analytics/alerts` page renders with 4 KPI cards
- [ ] Noisiest rules table shows top 10 by alert count
- [ ] "Tune" button navigates to rule detail page
- [ ] Trend chart shows daily alert counts
- [ ] Resolution breakdown shows auto/manual/work_order/dismissed split
- [ ] Suggested tuning highlights rules firing >50x/week
- [ ] Site filter scopes all data
- [ ] Period toggle (30d/90d) refreshes all sections
- [ ] Permission `view alert analytics` gates access

---

## QA Test Plan (All 4 Features)

### Test Credentials

| Role | Email | Password |
|---|---|---|
| super_admin | super@astrea.io | password |
| org_admin | admin@cadenademo.com | password |
| site_manager | manager@cadenademo.com | password |
| site_viewer | viewer@cadenademo.com | password |

### Test Scenarios

**1. Maintenance Windows**
- [ ] Create a maintenance window for Tuesday 2-4pm on Zone A
- [ ] Verify alerts suppressed for Zone A during that window
- [ ] Verify Zone B alerts NOT suppressed
- [ ] Toggle suppress_alerts off → verify alerts fire again
- [ ] site_viewer cannot access the page (403)

**2. Mass Offline Detection**
- [ ] Take all devices at a site offline → verify 1 site-level alert (not 15 individual)
- [ ] Take gateway offline first → alert says "Gateway offline" not "power outage"
- [ ] Take 2 out of 10 devices offline → verify individual handling (not mass)
- [ ] Verify work orders NOT created during mass offline

**3. Outage Declaration**
- [ ] Login as super_admin → Command Center → "Declare Outage"
- [ ] Fill reason + services → Submit → banner appears
- [ ] Verify all alert evaluation suppressed platform-wide
- [ ] Click "End Outage" → banner disappears → monitoring resumes
- [ ] Login as org_admin → verify banner visible but no declare/end buttons

**4. Alert Analytics**
- [ ] Navigate to /analytics/alerts → see 4 KPI cards
- [ ] Noisiest rules table populated (requires existing alert data)
- [ ] Click "Tune" on a rule → navigates to rule detail
- [ ] Toggle 30d/90d → data refreshes
- [ ] Filter by site → all sections scoped

---

## Regression Risk

| Feature | Risk Area | Mitigation |
|---|---|---|
| Maintenance Windows | RuleEvaluator change — could block legitimate alerts | `isActiveForZone()` checks time precisely. Disabled windows (suppress=false) are skipped. |
| Mass Offline | CheckDeviceHealth refactor — could miss individual offline devices | Devices still marked offline. Only work order creation is suppressed. |
| Outage Declaration | Global suppression — nuclear option | Only super_admin can trigger. Banner visible to all. `isActive()` check is first in pipeline. |
| Alert Analytics | Query performance on large alert tables | Indexed `triggered_at`, `rule_id`, `site_id`. Queries scoped to date range. |
