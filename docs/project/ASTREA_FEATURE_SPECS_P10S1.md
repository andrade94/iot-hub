# Phase 10 Sprint 1 — Feature Implementation Specs

> **Generated:** 2026-03-20 | Phase 7 --focus phase-10-sprint-1
> **Scope:** 5 features — Foundation (data reliability) + Compliance (corrective actions)
> **Refs:** SYSTEM_BEHAVIOR_SPEC.md (BR-055→BR-100), WORKFLOW_UX_DESIGN.md (WF-013→WF-026), IMPLEMENTATION_GAP_REPORT.md

---

## Build Order

```
Feature 1: Duplicate Reading Protection  (~2h)  — no dependencies
Feature 2: Sensor Data Sanity Checks    (~6h)  — depends on Feature 1
Feature 3: Zero Readings Detection       (~3h)  — no dependencies (parallel with 2)
Feature 4: Health Check Endpoint         (~2h)  — no dependencies (parallel with 2-3)
Feature 5: Corrective Actions            (~8h)  — no dependencies on 1-4
                                                    but build after them to stay on clean pipeline

Recommended parallelization:
  Day 1 AM: Feature 1 (quick win) → Feature 4 (quick win)
  Day 1 PM: Feature 2 (sanity checks)
  Day 2 AM: Feature 3 (zero readings)
  Day 2 PM: Feature 5 migration + model + service
  Day 3:    Feature 5 controller + frontend + tests
```

---

## Feature 1: Duplicate Reading Protection

**Gap:** BR-096 (CRITICAL) — MISSING
**Why:** If `ProcessSensorReading` runs twice for the same payload (queue retry after timeout), same reading stored twice. Corrupts charts, reports, compliance data.

### 1a. Migration

**File:** `database/migrations/2026_03_20_000001_add_unique_constraint_to_sensor_readings.php`

```php
public function up(): void
{
    // Add unique constraint to prevent duplicate readings
    // Uses raw SQL because Laravel's ->unique() on existing table with
    // composite columns + nullable created_at is cleaner this way
    Schema::table('sensor_readings', function (Blueprint $table) {
        $table->unique(['device_id', 'time', 'metric'], 'sensor_readings_device_time_metric_unique');
    });
}

public function down(): void
{
    Schema::table('sensor_readings', function (Blueprint $table) {
        $table->dropUnique('sensor_readings_device_time_metric_unique');
    });
}
```

**Note:** The existing composite index `[device_id, metric, time]` will be superseded by the unique constraint index. Drop the old index if needed to avoid duplication:

```php
// Optional: in up()
$table->dropIndex('sensor_readings_device_id_metric_time_index');
```

### 1b. ReadingStorageService Change

**File:** `app/Services/Readings/ReadingStorageService.php`
**Change:** Replace `SensorReading::create()` with upsert/insertOrIgnore.

**Current code** (around line 20-27 in store method):
```php
foreach ($readings as $metric => $data) {
    SensorReading::create([...]);
}
```

**New code:**
```php
$records = [];
foreach ($readings as $metric => $data) {
    $records[] = [
        'device_id' => $device->id,
        'time'      => now(),
        'metric'    => $metric,
        'value'     => $data['value'],
        'unit'      => $data['unit'] ?? null,
        'created_at' => now(),
    ];
}

// Insert, silently skip duplicates (ON CONFLICT DO NOTHING)
SensorReading::insertOrIgnore($records);
```

**Why `insertOrIgnore` over `upsert`:** We never want to update an existing reading — if it already exists, the duplicate should be silently dropped. `insertOrIgnore` maps to `INSERT ... ON CONFLICT DO NOTHING` in PostgreSQL.

### 1c. Test

**File:** `tests/Feature/Services/ReadingStorageServiceTest.php` (add to existing or create)

```
test('duplicate readings are silently ignored')
  - Store reading (device_id=1, time=X, metric='temperature', value=22.5)
  - Store same reading again (same device_id, time, metric)
  - Assert SensorReading::count() === 1
  - Assert no exception thrown

test('different metrics at same time are stored separately')
  - Store (device_id=1, time=X, metric='temperature', value=22.5)
  - Store (device_id=1, time=X, metric='humidity', value=65.0)
  - Assert SensorReading::count() === 2
```

### 1d. Acceptance Criteria

- [ ] Unique constraint on `(device_id, time, metric)` exists in DB
- [ ] `ReadingStorageService::store()` uses `insertOrIgnore`
- [ ] Duplicate payload processed twice produces only 1 reading row
- [ ] Different metrics at same timestamp stored correctly
- [ ] Existing tests still pass (no regression)

---

## Feature 2: Sensor Data Sanity Checks

**Gap:** BR-086, BR-087, BR-088 (CRITICAL) — MISSING
**Why:** Sensors occasionally send physically impossible values (500°C from EM300-TH rated -40 to 85°C). Bad data triggers false alerts, corrupts reports, destroys client trust.

### 2a. Migration: device_anomalies table

**File:** `database/migrations/2026_03_20_000002_create_device_anomalies_table.php`

```php
public function up(): void
{
    Schema::create('device_anomalies', function (Blueprint $table) {
        $table->id();
        $table->foreignId('device_id')->constrained()->cascadeOnDelete();
        $table->string('metric');
        $table->double('value');
        $table->double('valid_min');
        $table->double('valid_max');
        $table->string('unit')->nullable();
        $table->timestamp('recorded_at');
        $table->timestamp('created_at')->nullable();
    });
}
```

### 2b. SanityCheckService

**File:** `app/Services/Readings/SanityCheckService.php` (NEW)

```php
<?php

namespace App\Services\Readings;

use App\Models\Device;
use App\Models\DeviceAnomaly;
use Illuminate\Support\Facades\Redis;

class SanityCheckService
{
    /**
     * Valid ranges per sensor model per metric.
     * Source: manufacturer datasheets (VL-018).
     */
    public const VALID_RANGES = [
        'EM300-TH' => [
            'temperature' => ['min' => -40, 'max' => 85],
            'humidity'    => ['min' => 0,   'max' => 100],
            'battery'     => ['min' => 0,   'max' => 100],
        ],
        'EM300-MCS' => [
            'temperature' => ['min' => -40, 'max' => 85],
            'battery'     => ['min' => 0,   'max' => 100],
        ],
        'EM300-PT' => [
            'temperature' => ['min' => -40, 'max' => 85],
            'pressure'    => ['min' => 0,   'max' => 1100],
            'battery'     => ['min' => 0,   'max' => 100],
        ],
        'CT101' => [
            'current'      => ['min' => 0, 'max' => 100],
            'power_factor' => ['min' => 0, 'max' => 1],
            'battery'      => ['min' => 0, 'max' => 100],
        ],
        'WS301' => [
            'door_status' => ['min' => 0, 'max' => 1],
            'battery'     => ['min' => 0, 'max' => 100],
        ],
        'AM307' => [
            'temperature' => ['min' => -20, 'max' => 60],
            'humidity'    => ['min' => 0,   'max' => 100],
            'co2'         => ['min' => 0,   'max' => 5000],
            'tvoc'        => ['min' => 0,   'max' => 60000],
            'pressure'    => ['min' => 300, 'max' => 1100],
            'battery'     => ['min' => 0,   'max' => 100],
        ],
        'EM310-UDL' => [
            'distance' => ['min' => 0, 'max' => 15000],
            'battery'  => ['min' => 0, 'max' => 100],
        ],
        'GS101' => [
            'gas_alarm'         => ['min' => 0, 'max' => 1],
            'gas_concentration' => ['min' => 0, 'max' => 10000],
        ],
    ];

    /**
     * Filter readings, removing invalid values and logging anomalies.
     *
     * @return array Valid readings only (metric => {value, unit})
     */
    public function validate(Device $device, array $readings): array
    {
        $model = $device->model;
        $ranges = self::VALID_RANGES[$model] ?? null;

        // If model has no defined ranges, pass everything through
        if ($ranges === null) {
            return $readings;
        }

        $valid = [];

        foreach ($readings as $metric => $data) {
            $value = $data['value'];
            $range = $ranges[$metric] ?? null;

            // If metric has no range defined, allow it
            if ($range === null) {
                $valid[$metric] = $data;
                continue;
            }

            if ($value >= $range['min'] && $value <= $range['max']) {
                $valid[$metric] = $data;
            } else {
                // Log anomaly
                DeviceAnomaly::create([
                    'device_id'   => $device->id,
                    'metric'      => $metric,
                    'value'       => $value,
                    'valid_min'   => $range['min'],
                    'valid_max'   => $range['max'],
                    'unit'        => $data['unit'] ?? null,
                    'recorded_at' => now(),
                ]);

                // Check anomaly threshold (5+ in 1 hour → alert)
                $this->checkAnomalyThreshold($device, $metric, $range);
            }
        }

        return $valid;
    }

    /**
     * If device sends 5+ invalid readings in 1 hour, create anomaly alert (BR-088).
     */
    private function checkAnomalyThreshold(Device $device, string $metric, array $range): void
    {
        $key = "anomaly_count:{$device->id}:{$metric}";
        $count = Redis::incr($key);

        if ($count === 1) {
            Redis::expire($key, 3600); // 1 hour window
        }

        if ($count === 5) {
            // Create a system alert for hardware failure suspicion
            \App\Models\Alert::create([
                'site_id'      => $device->site_id,
                'device_id'    => $device->id,
                'severity'     => 'high',
                'status'       => 'active',
                'triggered_at' => now(),
                'data'         => [
                    'type'       => 'sensor_anomaly',
                    'rule_name'  => "Sensor sending invalid data",
                    'device_name' => $device->name,
                    'metric'     => $metric,
                    'message'    => "Device {$device->name} sent 5+ invalid {$metric} readings in the last hour (valid range: {$range['min']}–{$range['max']}). Possible hardware failure.",
                ],
            ]);
        }
    }
}
```

### 2c. DeviceAnomaly Model

**File:** `app/Models/DeviceAnomaly.php` (NEW)

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeviceAnomaly extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'device_id', 'metric', 'value', 'valid_min', 'valid_max',
        'unit', 'recorded_at',
    ];

    protected function casts(): array
    {
        return [
            'value'       => 'float',
            'valid_min'   => 'float',
            'valid_max'   => 'float',
            'recorded_at' => 'datetime',
            'created_at'  => 'datetime',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
```

### 2d. Integration into ProcessSensorReading

**File:** `app/Jobs/ProcessSensorReading.php`
**Change:** Add sanity check BETWEEN decode and store (before line 59).

**Current flow:**
```
decode → store → evaluate alert rules → broadcast
```

**New flow:**
```
decode → SANITY CHECK → store (valid only) → evaluate alert rules → broadcast
```

**Code change** (in `handle()` method, after decode, before store):

```php
// After: $readings = DecoderFactory::decode($device->model, $this->payload);
// Before: $storageService->store(...)

// Sanity check: filter invalid readings (BR-086, BR-087, BR-088)
$sanityService = app(SanityCheckService::class);
$readings = $sanityService->validate($device, $readings);

if (empty($readings)) {
    Log::info("ProcessSensorReading: all readings from device {$device->id} failed sanity check — skipping storage");
    return;
}

// Continue with: $storageService->store($device, $readings, $this->rssi);
```

### 2e. Tests

**File:** `tests/Feature/Services/SanityCheckServiceTest.php` (NEW)

```
test('valid EM300-TH readings pass through')
  - Device model='EM300-TH', readings: temp=22.5, humidity=65
  - Assert both returned

test('out-of-range temperature is filtered and anomaly logged')
  - Device model='EM300-TH', readings: temp=500
  - Assert empty returned
  - Assert DeviceAnomaly::count() === 1
  - Assert anomaly has correct value/min/max

test('mixed valid and invalid readings returns only valid')
  - Device model='EM300-TH', readings: temp=22.5 (valid), humidity=150 (invalid)
  - Assert only temperature returned

test('5 anomalies in 1 hour creates alert')
  - Device model='EM300-TH'
  - Send 5 invalid readings via validate()
  - Assert Alert::where('data->type', 'sensor_anomaly')->count() === 1

test('unknown sensor model passes all readings through')
  - Device model='UNKNOWN', readings: temp=9999
  - Assert reading returned (no filtering)

test('battery metric validated across all models')
  - Device model='EM300-TH', readings: battery=150
  - Assert filtered out
```

### 2f. Acceptance Criteria

- [ ] `SanityCheckService` validates readings against per-model ranges
- [ ] Invalid readings discarded before storage (never reach sensor_readings table)
- [ ] Invalid readings logged to `device_anomalies` table
- [ ] 5+ anomalies in 1 hour triggers "Sensor sending invalid data" alert
- [ ] Valid readings and unknown models pass through unchanged
- [ ] Alert evaluation only runs on valid readings
- [ ] Existing data pipeline tests pass

---

## Feature 3: Zero Readings Detection

**Gap:** BR-097, BR-098 (CRITICAL) — MISSING
**Why:** If ChirpStack/MQTT goes down, zero readings arrive platform-wide. Without detection, 30+ minutes of silent outage during food safety monitoring.

### 3a. Job

**File:** `app/Jobs/DetectPlatformOutage.php` (NEW)

```php
<?php

namespace App\Jobs;

use App\Models\SensorReading;
use App\Models\User;
use App\Notifications\PlatformOutageAlert;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Redis;

class DetectPlatformOutage implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        // Check if ANY readings received platform-wide in last 10 minutes
        $recentReadings = SensorReading::where('time', '>=', now()->subMinutes(10))->exists();

        if ($recentReadings) {
            // Clear any previous outage flag
            Redis::del('platform_outage_alerted');
            return;
        }

        // Avoid duplicate alerts: only fire once per outage window
        if (Redis::get('platform_outage_alerted')) {
            return;
        }

        Redis::set('platform_outage_alerted', now()->toIso8601String(), 'EX', 3600);

        // Get last reading timestamp for context
        $lastReading = SensorReading::orderByDesc('time')->value('time');

        // Notify all super_admins
        $superAdmins = User::role('super_admin')->get();

        foreach ($superAdmins as $admin) {
            $admin->notify(new PlatformOutageAlert($lastReading));
        }
    }
}
```

### 3b. Notification

**File:** `app/Notifications/PlatformOutageAlert.php` (NEW)

```php
<?php

namespace App\Notifications;

use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PlatformOutageAlert extends Notification
{
    use Queueable;

    public function __construct(
        public ?string $lastReadingAt = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $lastAt = $this->lastReadingAt
            ? Carbon::parse($this->lastReadingAt)->diffForHumans()
            : 'unknown';

        return (new MailMessage)
            ->subject('🚨 Platform Alert: No sensor data received')
            ->line("No sensor readings have been received platform-wide in the last 10 minutes.")
            ->line("Last reading received: {$lastAt}")
            ->line('Possible cause: MQTT broker down, ChirpStack outage, or network issue.')
            ->action('View Health', url('/command-center'))
            ->line('Investigate immediately.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title'   => 'No sensor data received',
            'message' => 'No readings received platform-wide in 10 minutes. Possible MQTT/ChirpStack outage.',
            'type'    => 'error',
            'icon'    => 'AlertTriangle',
            'last_reading_at' => $this->lastReadingAt,
        ];
    }
}
```

### 3c. Schedule Registration

**File:** `bootstrap/app.php` — add after `CheckDeviceHealth` (line ~76):

```php
// Detect platform-wide outage (every 5 minutes)
$schedule->job(new \App\Jobs\DetectPlatformOutage)->everyFiveMinutes();
```

### 3d. Test

**File:** `tests/Feature/Jobs/DetectPlatformOutageTest.php` (NEW)

```
test('no alert when recent readings exist')
  - Create SensorReading with time=now()
  - Run DetectPlatformOutage
  - Assert Notification::assertNothingSent()

test('alert sent when no readings in 10 minutes')
  - Create SensorReading with time=now()-15min (or no readings at all)
  - Create super_admin user
  - Run DetectPlatformOutage
  - Assert super_admin received PlatformOutageAlert

test('duplicate alert not sent within cooldown window')
  - No recent readings
  - Run DetectPlatformOutage twice
  - Assert only 1 notification sent (Redis dedup)

test('alert includes last reading timestamp')
  - Create SensorReading with time=now()-20min
  - Run job
  - Assert notification contains last_reading_at
```

### 3e. Acceptance Criteria

- [ ] `DetectPlatformOutage` job runs every 5 minutes
- [ ] Fires when zero readings received platform-wide in last 10 minutes
- [ ] Notifies all super_admin users via email + in-app
- [ ] Does NOT fire duplicate alerts (Redis dedup with 1h cooldown)
- [ ] Clears outage flag when readings resume

---

## Feature 4: Health Check Endpoint

**Gap:** BR-092, BR-093, INT-009 (HIGH) — MISSING
**Why:** Platform goes down and nobody knows until a client calls. External monitoring (Pingdom, Better Uptime) needs a `/health` endpoint.

### 4a. Controller

**File:** `app/Http/Controllers/HealthCheckController.php` (NEW)

```php
<?php

namespace App\Http\Controllers;

use App\Models\SensorReading;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class HealthCheckController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'db'    => $this->checkDatabase(),
            'redis' => $this->checkRedis(),
            'queue_depth' => $this->getQueueDepth(),
            'last_mqtt_reading_at' => $this->getLastReadingTime(),
        ];

        $allHealthy = $checks['db'] && $checks['redis'];

        return response()->json([
            'status' => $allHealthy ? 'ok' : 'degraded',
            'checks' => $checks,
            'timestamp' => now()->toIso8601String(),
        ], $allHealthy ? 200 : 503);
    }

    private function checkDatabase(): bool
    {
        try {
            DB::connection()->getPdo();
            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function checkRedis(): bool
    {
        try {
            Redis::ping();
            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function getQueueDepth(): int
    {
        try {
            return (int) Redis::llen('queues:default');
        } catch (\Throwable) {
            return -1;
        }
    }

    private function getLastReadingTime(): ?string
    {
        try {
            return SensorReading::orderByDesc('time')
                ->value('time')
                ?->toIso8601String();
        } catch (\Throwable) {
            return null;
        }
    }
}
```

### 4b. Route

**File:** `routes/web.php` — add outside auth middleware group:

```php
// Health check (public, no auth — for external monitoring)
Route::get('/health', HealthCheckController::class)->name('health');
```

### 4c. Test

**File:** `tests/Feature/Http/HealthCheckTest.php` (NEW)

```
test('health check returns 200 when all systems healthy')
  - GET /health
  - Assert 200
  - Assert JSON: status=ok, checks.db=true, checks.redis=true

test('health check returns 503 when database is down')
  - Mock DB::connection() to throw
  - GET /health
  - Assert 503
  - Assert JSON: status=degraded, checks.db=false

test('health check includes last reading timestamp')
  - Create SensorReading
  - GET /health
  - Assert checks.last_mqtt_reading_at is not null

test('health check is accessible without authentication')
  - GET /health (no auth)
  - Assert 200 (not redirected to login)
```

### 4d. Acceptance Criteria

- [ ] `GET /health` returns JSON with db, redis, queue_depth, last_mqtt_reading_at
- [ ] Returns HTTP 200 when healthy, 503 when degraded
- [ ] Accessible without authentication (public endpoint)
- [ ] Does not expose sensitive data (no credentials, no internal IPs)
- [ ] Response time < 500ms

---

## Feature 5: Corrective Actions + Compliance Report Update

**Gap:** BR-055→BR-058 (CRITICAL), SM-011, NT-012 — MISSING
**Why:** When a temperature excursion occurs, COFEPRIS auditors ask: "What did you DO about it?" Without logged corrective actions, clients fail audits, blame Astrea, and churn.

### 5a. Migration

**File:** `database/migrations/2026_03_20_000003_create_corrective_actions_table.php`

```php
public function up(): void
{
    Schema::create('corrective_actions', function (Blueprint $table) {
        $table->id();
        $table->foreignId('alert_id')->constrained()->cascadeOnDelete();
        $table->foreignId('site_id')->constrained()->cascadeOnDelete();
        $table->text('action_taken');
        $table->text('notes')->nullable();
        $table->string('status')->default('logged'); // logged, verified
        $table->foreignId('taken_by')->constrained('users')->cascadeOnDelete();
        $table->timestamp('taken_at');
        $table->unsignedBigInteger('verified_by')->nullable();
        $table->timestamp('verified_at')->nullable();
        $table->timestamps();

        $table->foreign('verified_by')->references('id')->on('users')->nullOnDelete();
    });
}
```

### 5b. Permission Seeder Update

**File:** `database/seeders/RolePermissionSeeder.php` — add to existing seeder:

```php
// Phase 10: Corrective Actions
'log corrective actions',
'verify corrective actions',
```

**Role assignments:**
```php
// log corrective actions → all roles
'super_admin'   => [...existing, 'log corrective actions', 'verify corrective actions'],
'org_admin'     => [...existing, 'log corrective actions', 'verify corrective actions'],
'site_manager'  => [...existing, 'log corrective actions', 'verify corrective actions'],
'site_viewer'   => [...existing, 'log corrective actions'],
'technician'    => [...existing, 'log corrective actions'],
```

### 5c. CorrectiveAction Model

**File:** `app/Models/CorrectiveAction.php` (NEW)

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class CorrectiveAction extends Model
{
    use LogsActivity;

    protected $fillable = [
        'alert_id', 'site_id', 'action_taken', 'notes', 'status',
        'taken_by', 'taken_at', 'verified_by', 'verified_at',
    ];

    protected function casts(): array
    {
        return [
            'taken_at'    => 'datetime',
            'verified_at' => 'datetime',
        ];
    }

    // --- State Machine (SM-011) ---

    public function verify(int $userId): self
    {
        if ($this->status !== 'logged') {
            throw new \InvalidArgumentException('Only logged actions can be verified.');
        }

        if ($this->taken_by === $userId) {
            throw new \InvalidArgumentException('Cannot verify your own corrective action.');
        }

        $this->update([
            'status'      => 'verified',
            'verified_by' => $userId,
            'verified_at' => now(),
        ]);

        return $this;
    }

    // --- Relationships ---

    public function alert(): BelongsTo
    {
        return $this->belongsTo(Alert::class);
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function takenByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'taken_by');
    }

    public function verifiedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    // --- Scopes ---

    public function scopeForAlert(mixed $query, int $alertId): mixed
    {
        return $query->where('alert_id', $alertId);
    }

    public function scopePendingVerification(mixed $query): mixed
    {
        return $query->where('status', 'logged');
    }

    // --- Activity Log ---

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['action_taken', 'status', 'verified_by'])
            ->logOnlyDirty();
    }
}
```

### 5d. Alert Model Extension

**File:** `app/Models/Alert.php` — add relationship:

```php
public function correctiveActions(): HasMany
{
    return $this->hasMany(CorrectiveAction::class);
}
```

Add `use Illuminate\Database\Eloquent\Relations\HasMany;` to imports if not present.

### 5e. CorrectiveActionPolicy

**File:** `app/Policies/CorrectiveActionPolicy.php` (NEW)

```php
<?php

namespace App\Policies;

use App\Models\Alert;
use App\Models\CorrectiveAction;
use App\Models\User;

class CorrectiveActionPolicy
{
    public function create(User $user, Alert $alert): bool
    {
        // Must have permission + alert must be critical or high severity
        return $user->hasPermissionTo('log corrective actions')
            && in_array($alert->severity, ['critical', 'high'])
            && $user->canAccessSite($alert->site_id);
    }

    public function verify(User $user, CorrectiveAction $action): bool
    {
        // Must have permission + must be different user than who logged it (BR-057)
        return $user->hasPermissionTo('verify corrective actions')
            && $action->taken_by !== $user->id
            && $action->status === 'logged'
            && $user->canAccessSite($action->site_id);
    }
}
```

### 5f. FormRequest

**File:** `app/Http/Requests/StoreCorrectiveActionRequest.php` (NEW)

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCorrectiveActionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', [\App\Models\CorrectiveAction::class, $this->route('alert')]);
    }

    public function rules(): array
    {
        return [
            'action_taken' => ['required', 'string', 'min:10', 'max:2000'],
            'notes'        => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'action_taken.min' => 'Describe the corrective action taken (at least 10 characters).',
        ];
    }
}
```

### 5g. Controller

**File:** `app/Http/Controllers/CorrectiveActionController.php` (NEW)

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCorrectiveActionRequest;
use App\Models\Alert;
use App\Models\CorrectiveAction;

class CorrectiveActionController extends Controller
{
    public function store(StoreCorrectiveActionRequest $request, Alert $alert)
    {
        CorrectiveAction::create([
            'alert_id'     => $alert->id,
            'site_id'      => $alert->site_id,
            'action_taken' => $request->validated('action_taken'),
            'notes'        => $request->validated('notes'),
            'status'       => 'logged',
            'taken_by'     => $request->user()->id,
            'taken_at'     => now(),
        ]);

        return back()->with('success', 'Corrective action logged.');
    }

    public function verify(Alert $alert, CorrectiveAction $correctiveAction)
    {
        $this->authorize('verify', $correctiveAction);

        $correctiveAction->verify(auth()->id());

        return back()->with('success', 'Corrective action verified.');
    }
}
```

### 5h. Routes

**File:** `routes/web.php` — add inside the auth middleware group, near alert routes:

```php
// Corrective Actions (Phase 10)
Route::post('/alerts/{alert}/corrective-actions', [CorrectiveActionController::class, 'store'])
    ->name('corrective-actions.store');
Route::post('/alerts/{alert}/corrective-actions/{correctiveAction}/verify', [CorrectiveActionController::class, 'verify'])
    ->name('corrective-actions.verify');
```

### 5i. AlertController Update

**File:** `app/Http/Controllers/AlertController.php` — update `show()` to eager-load corrective actions:

**Current** (line ~57):
```php
$alert->load(['device', 'site', 'rule', 'notifications.user', 'resolvedByUser']);
```

**New:**
```php
$alert->load([
    'device', 'site', 'rule', 'notifications.user', 'resolvedByUser',
    'correctiveActions.takenByUser', 'correctiveActions.verifiedByUser',
]);
```

### 5j. Frontend: Alert Detail Corrective Action Section

**File:** `resources/js/pages/alerts/show.tsx` — add new section after Notification Log.

The section follows spec 4.48 from WORKFLOW_UX_DESIGN.md:

**New component to add within the page** (inline, not a separate file):

```tsx
// Section: Corrective Actions (only for critical/high alerts)
{['critical', 'high'].includes(alert.severity) && (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                Corrective Actions
                {alert.corrective_actions?.length > 0 && (
                    <Badge variant={alert.corrective_actions.every(ca => ca.status === 'verified') ? 'success' : 'warning'}>
                        {alert.corrective_actions.length}
                    </Badge>
                )}
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {/* Existing actions */}
            {alert.corrective_actions?.map(ca => (
                <div key={ca.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{ca.taken_by_user.name}</span>
                            <span>·</span>
                            <span>{formatTimeAgo(ca.taken_at)}</span>
                        </div>
                        <Badge variant={ca.status === 'verified' ? 'success' : 'warning'}>
                            {ca.status === 'verified' ? 'Verified ✓' : 'Pending verification'}
                        </Badge>
                    </div>
                    <p className="text-sm">{ca.action_taken}</p>
                    {ca.notes && <p className="text-xs text-muted-foreground">{ca.notes}</p>}
                    {ca.status === 'verified' && ca.verified_by_user && (
                        <p className="text-xs text-muted-foreground">
                            Verified by {ca.verified_by_user.name} · {formatTimeAgo(ca.verified_at)}
                        </p>
                    )}
                    {/* Verify button */}
                    <Can permission="verify corrective actions">
                        {ca.status === 'logged' && ca.taken_by !== auth.user.id && (
                            <Button
                                size="sm" variant="outline"
                                onClick={() => router.post(
                                    route('corrective-actions.verify', { alert: alert.id, correctiveAction: ca.id }),
                                    {}, { preserveScroll: true }
                                )}
                            >
                                <CheckCircle2 className="mr-1 h-4 w-4" /> Verify
                            </Button>
                        )}
                    </Can>
                </div>
            ))}

            {/* Empty state */}
            {(!alert.corrective_actions || alert.corrective_actions.length === 0) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    <AlertTriangle className="mb-1 inline h-4 w-4" />
                    {' '}This excursion requires a corrective action for compliance.
                </div>
            )}

            {/* Log action form */}
            <Can permission="log corrective actions">
                {showForm ? (
                    <form onSubmit={submitAction} className="space-y-3">
                        <Textarea
                            value={caForm.data.action_taken}
                            onChange={e => caForm.setData('action_taken', e.target.value)}
                            placeholder="Describe what was done to address this excursion..."
                            rows={3}
                        />
                        <InputError message={caForm.errors.action_taken} />
                        <div className="flex gap-2">
                            <Button type="submit" size="sm" disabled={caForm.processing}>
                                Submit
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                ) : (
                    <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
                        <Plus className="mr-1 h-4 w-4" /> Log Corrective Action
                    </Button>
                )}
            </Can>
        </CardContent>
    </Card>
)}
```

**State & form setup** (add at top of component):

```tsx
const [showForm, setShowForm] = useState(false);
const caForm = useForm({ action_taken: '', notes: '' });

const submitAction = (e: React.FormEvent) => {
    e.preventDefault();
    caForm.post(route('corrective-actions.store', { alert: alert.id }), {
        preserveScroll: true,
        onSuccess: () => {
            caForm.reset();
            setShowForm(false);
        },
    });
};
```

### 5k. TemperatureReport Update

**File:** `app/Services/Reports/TemperatureReport.php`

**Change:** In `buildDeviceData()` (where excursions are built), add corrective action data to each excursion:

```php
// After detecting excursions for a device, enrich with corrective actions
use App\Models\CorrectiveAction;

// In the excursion loop, for each excursion that maps to an alert:
$excursionAlertIds = Alert::where('device_id', $device->id)
    ->where('site_id', $site->id)
    ->where('severity', 'in', ['critical', 'high'])
    ->whereBetween('triggered_at', [$from, $to])
    ->pluck('id');

$correctiveActions = CorrectiveAction::whereIn('alert_id', $excursionAlertIds)
    ->with('takenByUser')
    ->get()
    ->groupBy('alert_id');

// Attach to excursion data:
// Each excursion entry gets: 'corrective_actions' => [{action_taken, taken_by, taken_at, status}]
```

**PDF template update** — add corrective action rows to the excursion section of the Blade PDF template.

### 5l. TypeScript Types

**File:** `resources/js/types/index.d.ts` — add:

```typescript
interface CorrectiveAction {
    id: number;
    alert_id: number;
    site_id: number;
    action_taken: string;
    notes: string | null;
    status: 'logged' | 'verified';
    taken_by: number;
    taken_at: string;
    verified_by: number | null;
    verified_at: string | null;
    taken_by_user: User;
    verified_by_user: User | null;
}
```

Extend Alert interface:
```typescript
interface Alert {
    // ...existing fields
    corrective_actions?: CorrectiveAction[];
}
```

### 5m. Tests

**File:** `tests/Feature/Http/CorrectiveActionTest.php` (NEW)

```
test('user with permission can log corrective action on critical alert')
  - Create alert with severity=critical
  - POST /alerts/{id}/corrective-actions with action_taken (20 chars)
  - Assert 302 redirect
  - Assert CorrectiveAction::count() === 1
  - Assert status='logged', taken_by=auth user

test('cannot log corrective action on medium/low severity alert')
  - Create alert with severity=medium
  - POST /alerts/{id}/corrective-actions
  - Assert 403

test('action_taken must be at least 10 characters')
  - POST with action_taken='short'
  - Assert validation error

test('different user can verify corrective action')
  - Create corrective action by User A
  - Login as User B (site_manager)
  - POST /alerts/{id}/corrective-actions/{ca}/verify
  - Assert status='verified', verified_by=User B

test('same user cannot verify their own corrective action')
  - Create corrective action by User A
  - Login as User A
  - POST verify
  - Assert 403

test('site_viewer cannot verify corrective actions')
  - Login as site_viewer
  - POST verify
  - Assert 403

test('corrective actions appear on alert detail page')
  - Create alert + corrective action
  - GET /alerts/{id}
  - Assert Inertia response contains corrective_actions array

test('corrective actions included in temperature report data')
  - Create alert + corrective action + sensor readings
  - Generate temperature report
  - Assert report data includes corrective_actions for excursion
```

### 5n. Acceptance Criteria

- [ ] `corrective_actions` table created with all fields
- [ ] `log corrective actions` and `verify corrective actions` permissions seeded
- [ ] CorrectiveAction model with SM-011 state machine (logged → verified)
- [ ] Policy enforces: severity check, site access, different-user verification (BR-057)
- [ ] POST `/alerts/{id}/corrective-actions` creates action
- [ ] POST `/alerts/{id}/corrective-actions/{ca}/verify` verifies (different user guard)
- [ ] Alert Detail page shows corrective action section for critical/high alerts
- [ ] Warning banner when excursion has no corrective action
- [ ] Inline form to log action (expandable)
- [ ] Verify button visible to site_manager+ only, hidden for own actions
- [ ] Temperature report PDF includes corrective actions per excursion
- [ ] All 8 tests pass

---

## QA Test Plan (All 5 Features)

### Test Credentials

| Role | Email | Password |
|---|---|---|
| super_admin | super@astrea.io | password |
| org_admin | admin@cadenademo.com | password |
| site_manager | manager@cadenademo.com | password |
| site_viewer | viewer@cadenademo.com | password |
| technician | tech@cadenademo.com | password |

### Test Scenarios

**1. Duplicate Protection**
- [ ] Send same MQTT payload twice → only 1 reading stored
- [ ] Different metrics at same timestamp → both stored
- [ ] No error logs from duplicate handling

**2. Sanity Checks**
- [ ] EM300-TH reading 500°C → discarded, anomaly logged
- [ ] EM300-TH reading 22°C → stored normally
- [ ] 5 invalid readings from same device in 1 hour → alert created
- [ ] Valid + invalid in same payload → only valid stored

**3. Zero Readings**
- [ ] Stop MQTT ingestion for 10 minutes → super_admin gets notification
- [ ] Resume MQTT → no more notifications
- [ ] Multiple 5-minute cycles without data → only 1 notification (not 1 per cycle)

**4. Health Check**
- [ ] `curl http://iot-hub.test/health` → 200 JSON (no auth needed)
- [ ] Response includes: db, redis, queue_depth, last_mqtt_reading_at
- [ ] Kill Redis → response shows redis=false, status=degraded, HTTP 503

**5. Corrective Actions**
- [ ] Login as site_viewer → open critical alert → see warning banner
- [ ] Log corrective action → section updates with logged entry
- [ ] Login as site_manager → see "Verify" button on the action
- [ ] Verify → status changes to "Verified ✓"
- [ ] Login as same user who logged → "Verify" button NOT shown
- [ ] Open medium/low severity alert → corrective action section NOT shown
- [ ] Download temperature report → corrective action included in PDF

---

## Regression Risk

| Feature | Risk Area | Mitigation |
|---|---|---|
| Duplicate Protection | ReadingStorageService change — could affect Redis cache update | `insertOrIgnore` still returns; cache logic runs after. Run existing reading tests. |
| Sanity Checks | ProcessSensorReading pipeline — could filter legitimate readings | Config-driven ranges from datasheets. Unknown models pass through. |
| Zero Readings | New scheduled job — could send false alerts during maintenance | Redis dedup prevents floods. 10-minute threshold gives buffer for brief outages. |
| Health Check | Public endpoint — info disclosure risk | Only exposes: boolean health, queue count, last reading time. No credentials or internal details. |
| Corrective Actions | Alert detail page change — could break existing layout | Additive only (new Card section). Existing sections untouched. Only shows for critical/high. |
