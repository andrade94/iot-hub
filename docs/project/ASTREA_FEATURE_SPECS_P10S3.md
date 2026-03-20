# Phase 10 Sprint 3 — Feature Implementation Specs

> **Generated:** 2026-03-20 | Phase 7 --focus phase-10-sprint-3
> **Scope:** 8 features — UX at Scale + Compliance remainder (all remaining Phase 10 items)
> **Refs:** SYSTEM_BEHAVIOR_SPEC.md, WORKFLOW_UX_DESIGN.md, IMPLEMENTATION_GAP_REPORT.md

---

## Build Order

```
All 8 features are independent — no blocking dependencies between them.
Grouped by effort: quick wins first, then medium, then large.

Quick wins (~2-4h each):
  Feature 1: Dashboard Action Cards          (BR-099-100)  ~3h
  Feature 2: Compliance Report PDF Update    (BR-058)      ~2h
  Feature 3: LFPDPPP Consent Tracking        (BR-083-085)  ~4h

Medium (~6-8h each):
  Feature 4: Device Replacement Flow         (BR-059-063)  ~6h
  Feature 5: Alert Delivery Monitoring       (BR-094-095)  ~4h

Large (~8-12h each):
  Feature 6: Scheduled Report Delivery       (BR-069-072)  ~10h
  Feature 7: Data Export & Offboarding       (BR-064-066)  ~12h
  Feature 8: Site Template Cloning           (BR-089-091)  ~10h

Recommended schedule:
  Day 1:  Features 1-3 (quick wins — dashboard cards, PDF, consent)
  Day 2:  Features 4-5 (device replacement + delivery monitoring)
  Day 3:  Feature 6 (scheduled reports — migration, model, job, page)
  Day 4:  Feature 7 (data export — job, ZIP generation, page)
  Day 5:  Feature 8 (site templates — model, service, page)
```

---

## Feature 1: Dashboard Action Cards

**Gap:** BR-099, BR-100 (MEDIUM) — MISSING | **Effort:** ~3h

### 1a. DashboardController Update

**File:** `app/Http/Controllers/DashboardController.php`
Add to the `__invoke` return array:

```php
'actionCards' => [
    'unacknowledged_alerts' => Alert::whereIn('site_id', $siteIds)->active()->count(),
    'overdue_work_orders' => WorkOrder::whereIn('site_id', $siteIds)->where('status', 'open')
        ->where('created_at', '<', now()->subDays(3))->count(),
    'critical_battery' => Device::whereIn('site_id', $siteIds)->where('status', 'active')
        ->where('battery_pct', '<', 20)->count(),
],
```

Add imports: `Alert`, `WorkOrder`, `Device`.

### 1b. Dashboard Frontend Update

**File:** `resources/js/pages/dashboard.tsx`
Add `ActionCards` section between KPI cards and site grid. Only show cards with count > 0. Role-filtered per BR-100.

```tsx
{/* Needs Attention — action cards */}
{(actionCards.unacknowledged_alerts > 0 || actionCards.overdue_work_orders > 0 || actionCards.critical_battery > 0) && (
    <div className="grid gap-3 sm:grid-cols-3">
        {actionCards.unacknowledged_alerts > 0 && (
            <Link href="/alerts?status=active">
                <Card className="border-red-200 hover:border-red-300 transition-colors cursor-pointer dark:border-red-900">
                    <CardContent className="flex items-center gap-3 p-4">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <div>
                            <p className="text-sm font-medium">{actionCards.unacknowledged_alerts} alerts need acknowledgment</p>
                        </div>
                    </CardContent>
                </Card>
            </Link>
        )}
        {/* Similar for overdue_work_orders and critical_battery */}
    </div>
)}
```

### 1c. Tests

```
test('dashboard returns action card counts')
test('action cards scoped to user accessible sites')
```

---

## Feature 2: Compliance Report PDF Update

**Gap:** BR-058 (PARTIAL) — PDF template pending | **Effort:** ~2h

### 2a. TemperatureReport Update

**File:** `app/Services/Reports/TemperatureReport.php`
In `buildDeviceData()`, after detecting excursions, enrich each excursion with corrective actions:

```php
use App\Models\Alert;
use App\Models\CorrectiveAction;

// After excursion detection, find matching alerts and their corrective actions
$alertIds = Alert::where('device_id', $device->id)
    ->where('site_id', $site->id)
    ->whereIn('severity', ['critical', 'high'])
    ->whereBetween('triggered_at', [$from, $to])
    ->pluck('id');

$correctiveActions = CorrectiveAction::whereIn('alert_id', $alertIds)
    ->with('takenByUser:id,name')
    ->get()
    ->groupBy('alert_id');

// Attach to each excursion
foreach ($deviceData['excursions'] as &$excursion) {
    $excursion['corrective_actions'] = $correctiveActions->get($excursion['alert_id'], collect())
        ->map(fn ($ca) => [
            'action_taken' => $ca->action_taken,
            'taken_by' => $ca->takenByUser?->name,
            'taken_at' => $ca->taken_at->toIso8601String(),
            'status' => $ca->status,
        ])->values()->toArray();
}
```

### 2b. Tests

```
test('temperature report includes corrective actions for excursions')
```

---

## Feature 3: LFPDPPP Consent Tracking

**Gap:** BR-083-085 (CRITICAL→now HIGH) — MISSING | **Effort:** ~4h

### 3a. Migration

**File:** `database/migrations/2026_03_20_200001_add_privacy_consent_to_users.php`

```php
Schema::table('users', function (Blueprint $table) {
    $table->timestamp('privacy_accepted_at')->nullable();
    $table->string('privacy_policy_version')->nullable();
});
```

### 3b. Middleware

**File:** `app/Http/Middleware/EnsurePrivacyConsent.php` (NEW)

```php
public function handle(Request $request, Closure $next)
{
    $user = $request->user();
    $currentVersion = config('app.privacy_policy_version', '1.0');

    if ($user && $user->privacy_policy_version !== $currentVersion) {
        return Inertia::location(route('privacy.show'));
    }

    return $next($request);
}
```

Register in `bootstrap/app.php` as `'privacy'` alias, add to the auth middleware group.

### 3c. Controller + Routes

```php
Route::get('/privacy/accept', fn () => Inertia::render('privacy/accept', [
    'version' => config('app.privacy_policy_version', '1.0'),
]))->name('privacy.show')->middleware('auth');

Route::post('/privacy/accept', function (Request $request) {
    $request->user()->update([
        'privacy_accepted_at' => now(),
        'privacy_policy_version' => config('app.privacy_policy_version', '1.0'),
    ]);
    return redirect()->intended('/dashboard');
})->name('privacy.accept')->middleware('auth');
```

### 3d. Frontend Page

**File:** `resources/js/pages/privacy/accept.tsx` (NEW)
Centered card with scrollable policy text + "I Accept" button + "Log Out" link.

### 3e. Config

Add to `config/app.php`: `'privacy_policy_version' => env('PRIVACY_POLICY_VERSION', '1.0'),`

### 3f. Tests

```
test('user without consent is redirected to privacy page')
test('user can accept privacy policy')
test('accepted user can access dashboard normally')
test('policy version change re-prompts acceptance')
```

---

## Feature 4: Device Replacement Flow

**Gap:** BR-059-063 (PARTIAL) — field exists, no endpoint | **Effort:** ~6h

### 4a. DeviceReplacementService

**File:** `app/Services/Devices/DeviceReplacementService.php` (NEW)

```php
public function replace(Device $oldDevice, array $newDeviceData): Device
{
    // Create new device inheriting config from old (BR-059)
    $newDevice = Device::create([
        'site_id' => $oldDevice->site_id,
        'gateway_id' => $oldDevice->gateway_id,
        'model' => $newDeviceData['new_model'] ?? $oldDevice->model,
        'dev_eui' => $newDeviceData['new_dev_eui'],
        'app_key' => $newDeviceData['new_app_key'],
        'name' => $oldDevice->name,
        'zone' => $oldDevice->zone,
        'floor_id' => $oldDevice->floor_id,
        'floor_x' => $oldDevice->floor_x,
        'floor_y' => $oldDevice->floor_y,
        'recipe_id' => $oldDevice->recipe_id,
        'status' => 'pending',
        'replaced_device_id' => $oldDevice->id,
    ]);

    // Transfer alert rule bindings
    AlertRule::where('device_id', $oldDevice->id)
        ->update(['device_id' => $newDevice->id]);

    // Mark old device as replaced (BR-060)
    $oldDevice->update(['status' => 'replaced']);

    return $newDevice;
}
```

### 4b. Controller Method

**File:** `app/Http/Controllers/DeviceController.php` — add `replace()` method:

```php
public function replace(Request $request, Site $site, Device $device)
{
    $this->authorize('update', $device);
    abort_unless(in_array($device->status, ['active', 'offline']), 422, 'Only active or offline devices can be replaced.');

    $validated = $request->validate([
        'new_dev_eui' => 'required|string|max:16|unique:devices,dev_eui',
        'new_app_key' => 'required|string|max:32',
        'new_model' => 'nullable|string|in:EM300-TH,CT101,WS301,AM307,VS121,EM300-MCS,WS202',
    ]);

    $service = app(DeviceReplacementService::class);
    $service->replace($device, $validated);

    return back()->with('success', 'Device replaced. New device pending activation.');
}
```

### 4c. Route

```php
Route::post('sites/{site}/devices/{device}/replace', [DeviceController::class, 'replace'])->name('devices.replace');
```

### 4d. Frontend — Device Show Replace Dialog

**File:** `resources/js/pages/devices/show.tsx`
Add "Replace" button in header actions + dialog with new_dev_eui, new_app_key, new_model fields.

### 4e. Tests

```
test('technician can replace active device')
test('config transferred to new device (zone, floor, recipe, alert rules)')
test('old device marked as replaced')
test('cannot replace pending device')
test('new dev_eui must be unique')
```

---

## Feature 5: Alert Delivery Monitoring

**Gap:** BR-094-095 (MEDIUM) — MISSING | **Effort:** ~4h

### 5a. Command Center Controller Update

**File:** `app/Http/Controllers/CommandCenterController.php`
Add delivery health data to `index()`:

```php
'deliveryHealth' => [
    'whatsapp' => AlertNotification::where('channel', 'whatsapp')
        ->where('created_at', '>=', now()->subDay())
        ->selectRaw("SUM(status='sent') as sent, SUM(status='delivered') as delivered, SUM(status='failed') as failed")
        ->first(),
    'push' => AlertNotification::where('channel', 'push')
        ->where('created_at', '>=', now()->subDay())
        ->selectRaw("SUM(status='sent') as sent, SUM(status='delivered') as delivered, SUM(status='failed') as failed")
        ->first(),
    'email' => AlertNotification::where('channel', 'email')
        ->where('created_at', '>=', now()->subDay())
        ->selectRaw("SUM(status='sent') as sent, SUM(status='delivered') as delivered, SUM(status='failed') as failed")
        ->first(),
],
```

### 5b. Frontend — Command Center delivery cards

**File:** `resources/js/pages/command-center/index.tsx`
Add 3 delivery health cards below the org table (WhatsApp, Push, Email — each with sent/delivered/failed counts).

### 5c. Tests

```
test('command center includes delivery health data')
```

---

## Feature 6: Scheduled Report Delivery

**Gap:** BR-069-072 (HIGH) — MISSING | **Effort:** ~10h

### 6a. Migration

```php
Schema::create('report_schedules', function (Blueprint $table) {
    $table->id();
    $table->foreignId('org_id')->constrained('organizations')->cascadeOnDelete();
    $table->foreignId('site_id')->nullable()->constrained()->nullOnDelete();
    $table->string('type'); // temperature_compliance, energy_summary, alert_summary, executive_overview
    $table->string('frequency'); // daily, weekly, monthly
    $table->unsignedTinyInteger('day_of_week')->nullable(); // 0-6 for weekly
    $table->time('time')->default('08:00');
    $table->json('recipients_json'); // array of email addresses
    $table->boolean('active')->default(true);
    $table->foreignId('created_by')->constrained('users');
    $table->timestamps();
});
```

### 6b. ReportSchedule Model

Standard model with fillable, casts (recipients_json → array), relationships (org, site, createdBy).

### 6c. SendScheduledReports Job

**File:** `app/Jobs/SendScheduledReports.php` (NEW)

Runs daily. For each active schedule matching today's criteria:
- Check frequency (daily=always, weekly=day_of_week matches, monthly=1st)
- Generate report using existing TemperatureReport/EnergyReport services
- Email PDF to each recipient in recipients_json

Register in `bootstrap/app.php`: `$schedule->job(new SendScheduledReports)->dailyAt('06:00');`

### 6d. Controller + Routes + Page

Follow the compliance calendar CRUD pattern. Settings page at `/settings/report-schedules`.

### 6e. Permission

Add `'manage report schedules'` permission. Assign to super_admin, org_admin.

### 6f. Tests

```
test('org_admin can create report schedule')
test('schedule fires on correct day for weekly frequency')
test('schedule skips non-matching days')
test('recipients receive email with PDF attachment')
test('default schedule created on site activation (BR-072)')
```

---

## Feature 7: Data Export & Offboarding

**Gap:** BR-064-066, SM-012 (HIGH) — MISSING | **Effort:** ~12h

### 7a. Migration

```php
Schema::create('data_exports', function (Blueprint $table) {
    $table->id();
    $table->foreignId('org_id')->constrained('organizations')->cascadeOnDelete();
    $table->string('status')->default('queued'); // queued, processing, completed, failed, expired
    $table->date('date_from')->nullable();
    $table->date('date_to')->nullable();
    $table->string('file_path')->nullable();
    $table->unsignedBigInteger('file_size')->nullable();
    $table->unsignedTinyInteger('attempts')->default(0);
    $table->text('error')->nullable();
    $table->timestamp('completed_at')->nullable();
    $table->timestamp('expires_at')->nullable();
    $table->foreignId('requested_by')->constrained('users');
    $table->timestamps();
});
```

### 7b. DataExport Model with SM-012 state machine

States: queued → processing → completed/failed → expired.

### 7c. ExportOrganizationData Job

Async job that:
1. Queries sensor_readings (CSV, chunked by month)
2. Queries alerts + corrective_actions (CSV)
3. Queries work_orders + photos (ZIP subfolder)
4. Queries compliance_events (CSV)
5. Queries users (CSV, excluding passwords)
6. Copies invoice PDFs
7. ZIPs everything → stores in `storage/app/exports/`
8. Updates DataExport record → fires ExportReadyNotification

### 7d. Controller + Route + Page

Settings page at `/settings/export-data` with date range picker, status card, download link.
Add `'export organization data'` permission.

### 7e. Tests

```
test('org_admin can request data export')
test('export job creates ZIP with expected files')
test('export notification sent on completion')
test('rate limit: only 1 active export per org')
test('expired exports cleaned up after 48h')
```

---

## Feature 8: Site Template Cloning

**Gap:** BR-089-091 (HIGH→MEDIUM) — MISSING | **Effort:** ~10h

### 8a. Migration

```php
Schema::create('site_templates', function (Blueprint $table) {
    $table->id();
    $table->foreignId('org_id')->constrained('organizations')->cascadeOnDelete();
    $table->string('name');
    $table->text('description')->nullable();
    $table->json('modules'); // activated module slugs
    $table->json('zone_config')->nullable(); // [{name, type}]
    $table->json('recipe_assignments')->nullable(); // [{zone, recipe_id}]
    $table->json('escalation_structure')->nullable(); // escalation chain template
    $table->foreignId('created_by')->constrained('users');
    $table->timestamps();
    $table->unique(['org_id', 'name']);
});
```

### 8b. SiteTemplate Model + SiteTemplateService

Model with fillable + JSON casts. Service with:
- `capture(Site $sourceSite): SiteTemplate` — captures config from existing site
- `applyToSite(SiteTemplate $template, Site $targetSite): void` — pre-fills modules, zones, recipes, escalation

### 8c. Controller + Routes + Page

Settings page at `/settings/site-templates` with card grid. Dialog to create from source site.
Add `'manage site templates'` permission.

### 8d. Onboarding Integration

In `SiteOnboardingController`, add optional `template_id` parameter to step 1. If provided, apply template before proceeding.

### 8e. Tests

```
test('org_admin can create template from source site')
test('template captures modules, zones, recipes, escalation')
test('applying template pre-fills site config')
test('template name unique per org')
test('onboarding supports template_id parameter')
```

---

## QA Test Plan (All 8 Features)

### Quick Validation

| Feature | Key Test |
|---|---|
| Dashboard Action Cards | Land on dashboard → see cards with counts > 0 → click → navigates to filtered list |
| Compliance PDF | Download temperature report → PDF includes corrective action section |
| LFPDPPP Consent | New user first login → redirected to consent page → accept → dashboard |
| Device Replacement | Open offline device → Replace → enter new DevEUI → old device shows "replaced" |
| Delivery Monitoring | Command Center → see WhatsApp/Push/Email delivery stats (24h) |
| Scheduled Reports | Settings → Report Schedules → create weekly schedule → verify email received |
| Data Export | Settings → Data Export → request → wait for email → download ZIP → verify contents |
| Site Templates | Settings → Templates → create from source site → new site onboarding uses template |

---

## Acceptance Criteria Summary

| Feature | BRs Resolved | New Files | Effort |
|---|---|---|---|
| 1. Dashboard Action Cards | BR-099, BR-100 | 0 new (edit 2) | ~3h |
| 2. Compliance PDF Update | BR-058 | 0 new (edit 1) | ~2h |
| 3. LFPDPPP Consent | BR-083, BR-084, BR-085 | migration, middleware, page | ~4h |
| 4. Device Replacement | BR-059-063 | service, route, dialog | ~6h |
| 5. Delivery Monitoring | BR-094, BR-095 | 0 new (edit 2) | ~4h |
| 6. Scheduled Reports | BR-069-072 | migration, model, job, controller, page | ~10h |
| 7. Data Export | BR-064-066 | migration, model, job, controller, page | ~12h |
| 8. Site Templates | BR-089-091 | migration, model, service, controller, page | ~10h |
| **Total** | **17 BRs** | ~15 new files | **~51h** |

After Sprint 3, Phase 10 will be 100% complete (17/17 features built).
