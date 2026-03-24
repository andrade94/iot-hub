<?php

use App\Models\Alert;
use App\Models\AlertNotification;
use App\Models\AlertRule;
use App\Models\Device;
use App\Models\Gateway;
use App\Models\PushToken;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderNote;
use App\Models\WorkOrderPhoto;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

// ──────────────────────────────────────────────────────────────────────────
// Setup
// ──────────────────────────────────────────────────────────────────────────

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->device = createDevice($this->site, ['zone' => 'Zone A']);

    $this->siteManager = createUserWithRole('client_site_manager', $this->org);
    $this->siteManager->sites()->attach($this->site->id, ['role' => 'client_site_manager', 'assigned_at' => now()]);

    $this->technician = createUserWithRole('technician', $this->org);
    $this->technician->sites()->attach($this->site->id, ['role' => 'technician', 'assigned_at' => now()]);

    $this->siteViewer = createUserWithRole('client_site_viewer', $this->org);
    $this->siteViewer->sites()->attach($this->site->id, ['role' => 'client_site_viewer', 'assigned_at' => now()]);

    $this->orgAdmin = createUserWithRole('client_org_admin', $this->org);
});

// ──────────────────────────────────────────────────────────────────────────
// Auth — Login
// ──────────────────────────────────────────────────────────────────────────

test('login returns token for valid credentials', function () {
    $user = User::factory()->create([
        'org_id' => $this->org->id,
        'password' => bcrypt('password'),
        'has_app_access' => true,
    ]);
    $user->assignRole('technician');

    $this->postJson('/api/auth/login', [
        'email' => $user->email,
        'password' => 'password',
        'device_name' => 'iPhone 15',
    ])
        ->assertOk()
        ->assertJsonStructure([
            'data' => ['token', 'user' => ['id', 'name', 'email', 'roles', 'sites']],
        ]);
});

test('login rejects invalid credentials', function () {
    $this->postJson('/api/auth/login', [
        'email' => 'wrong@example.com',
        'password' => 'wrong',
        'device_name' => 'iPhone 15',
    ])->assertUnprocessable();
});

test('login rejects user without app access', function () {
    $user = User::factory()->create([
        'org_id' => $this->org->id,
        'password' => bcrypt('password'),
        'has_app_access' => false,
    ]);

    $this->postJson('/api/auth/login', [
        'email' => $user->email,
        'password' => 'password',
        'device_name' => 'iPhone 15',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

// ──────────────────────────────────────────────────────────────────────────
// Auth — Logout & User
// ──────────────────────────────────────────────────────────────────────────

test('logout revokes current token', function () {
    Sanctum::actingAs($this->siteManager);

    $this->postJson('/api/auth/logout')
        ->assertOk();
});

test('get current user returns profile with roles and sites', function () {
    Sanctum::actingAs($this->siteManager);

    $this->getJson('/api/auth/user')
        ->assertOk()
        ->assertJsonStructure([
            'data' => ['id', 'name', 'email', 'roles', 'permissions', 'sites'],
        ]);
});

test('unauthenticated request returns 401', function () {
    $this->getJson('/api/auth/user')
        ->assertUnauthorized();
});

// ──────────────────────────────────────────────────────────────────────────
// Dashboard
// ──────────────────────────────────────────────────────────────────────────

test('dashboard returns KPIs and site summaries', function () {
    Sanctum::actingAs($this->orgAdmin);

    $this->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'kpis' => ['total_devices', 'online_devices', 'online_pct', 'active_alerts', 'open_work_orders'],
                'sites',
            ],
        ]);
});

// ──────────────────────────────────────────────────────────────────────────
// Sites
// ──────────────────────────────────────────────────────────────────────────

test('site list returns accessible sites with KPIs', function () {
    Sanctum::actingAs($this->siteManager);

    $this->getJson('/api/sites')
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'name', 'kpis']]]);
});

test('site detail returns zones and alerts', function () {
    Sanctum::actingAs($this->siteManager);

    $this->getJson("/api/sites/{$this->site->id}")
        ->assertOk()
        ->assertJsonStructure(['data' => ['id', 'name', 'kpis', 'zones']]);
});

test('site detail rejects user without site access', function () {
    $otherOrg = createOrg(['slug' => 'other-org-test']);
    $otherUser = createUserWithRole('client_site_manager', $otherOrg);
    $otherUser->sites()->attach(
        createSite($otherOrg)->id,
        ['role' => 'client_site_manager', 'assigned_at' => now()]
    );
    Sanctum::actingAs($otherUser);

    $this->getJson("/api/sites/{$this->site->id}")
        ->assertForbidden();
});

test('zone detail returns devices grouped by zone', function () {
    Sanctum::actingAs($this->siteManager);

    $this->getJson("/api/sites/{$this->site->id}/zones/Zone A")
        ->assertOk()
        ->assertJsonStructure(['data' => ['zone', 'device_count', 'devices']]);
});

test('zone detail returns 404 for nonexistent zone', function () {
    Sanctum::actingAs($this->siteManager);

    $this->getJson("/api/sites/{$this->site->id}/zones/Nonexistent")
        ->assertNotFound();
});

// ──────────────────────────────────────────────────────────────────────────
// Devices
// ──────────────────────────────────────────────────────────────────────────

test('device detail returns full device info', function () {
    Sanctum::actingAs($this->orgAdmin);

    $this->getJson("/api/devices/{$this->device->id}")
        ->assertOk()
        ->assertJsonStructure([
            'data' => ['id', 'name', 'dev_eui', 'model', 'status', 'online', 'battery_pct', 'rssi'],
        ]);
});

test('device list for site works', function () {
    Sanctum::actingAs($this->orgAdmin);

    $this->getJson("/api/sites/{$this->site->id}/devices")
        ->assertOk()
        ->assertJsonStructure(['data']);
});

// ──────────────────────────────────────────────────────────────────────────
// Alerts
// ──────────────────────────────────────────────────────────────────────────

test('alert list returns paginated alerts', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Test Rule',
        'type' => 'temperature_high',
        'conditions' => ['metric' => 'temperature', 'operator' => '>', 'value' => 8],
        'severity' => 'high',
        'cooldown_minutes' => 15,
    ]);

    Alert::create([
        'rule_id' => $rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'high',
        'status' => 'active',
        'triggered_at' => now(),
        'data' => ['metric' => 'temperature', 'value' => 12.5],
    ]);

    Sanctum::actingAs($this->siteManager);

    $this->getJson('/api/alerts')
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'severity', 'status', 'triggered_at']]]);
});

test('alert list filters by severity', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Test Rule',
        'type' => 'temperature_high',
        'conditions' => ['metric' => 'temperature', 'operator' => '>', 'value' => 8],
        'severity' => 'critical',
        'cooldown_minutes' => 15,
    ]);

    Alert::create([
        'rule_id' => $rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'critical',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    Alert::create([
        'rule_id' => $rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'low',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    Sanctum::actingAs($this->siteManager);

    $response = $this->getJson('/api/alerts?severity=critical')
        ->assertOk();

    $data = $response->json('data');
    expect(collect($data)->every(fn ($a) => $a['severity'] === 'critical'))->toBeTrue();
});

test('alert detail returns full alert info', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Test Rule',
        'type' => 'temperature_high',
        'conditions' => [],
        'severity' => 'high',
        'cooldown_minutes' => 15,
    ]);

    $alert = Alert::create([
        'rule_id' => $rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'high',
        'status' => 'active',
        'triggered_at' => now(),
        'data' => ['metric' => 'temperature', 'value' => 12.5],
    ]);

    Sanctum::actingAs($this->siteManager);

    $this->getJson("/api/alerts/{$alert->id}")
        ->assertOk()
        ->assertJsonStructure([
            'data' => ['id', 'severity', 'status', 'device', 'site', 'rule', 'notifications'],
        ]);
});

test('site_manager can acknowledge an active alert', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Test Rule',
        'type' => 'temperature_high',
        'conditions' => [],
        'severity' => 'high',
        'cooldown_minutes' => 15,
    ]);

    $alert = Alert::create([
        'rule_id' => $rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'high',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    Sanctum::actingAs($this->siteManager);

    $this->postJson("/api/alerts/{$alert->id}/acknowledge")
        ->assertOk()
        ->assertJsonPath('data.status', 'acknowledged');

    expect($alert->fresh()->status)->toBe('acknowledged');
});

test('technician can acknowledge an active alert', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Test Rule',
        'type' => 'temperature_high',
        'conditions' => [],
        'severity' => 'high',
        'cooldown_minutes' => 15,
    ]);

    $alert = Alert::create([
        'rule_id' => $rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'high',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    Sanctum::actingAs($this->technician);

    $this->postJson("/api/alerts/{$alert->id}/acknowledge")
        ->assertOk();
});

test('site_viewer cannot acknowledge alerts', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Test Rule',
        'type' => 'temperature_high',
        'conditions' => [],
        'severity' => 'high',
        'cooldown_minutes' => 15,
    ]);

    $alert = Alert::create([
        'rule_id' => $rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'high',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    Sanctum::actingAs($this->siteViewer);

    $this->postJson("/api/alerts/{$alert->id}/acknowledge")
        ->assertForbidden();
});

test('cannot acknowledge already resolved alert', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Test Rule',
        'type' => 'temperature_high',
        'conditions' => [],
        'severity' => 'high',
        'cooldown_minutes' => 15,
    ]);

    $alert = Alert::create([
        'rule_id' => $rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'high',
        'status' => 'acknowledged',
        'triggered_at' => now(),
        'acknowledged_at' => now(),
    ]);

    Sanctum::actingAs($this->siteManager);

    $this->postJson("/api/alerts/{$alert->id}/acknowledge")
        ->assertUnprocessable();
});

test('site_manager can resolve an alert', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Test Rule',
        'type' => 'temperature_high',
        'conditions' => [],
        'severity' => 'high',
        'cooldown_minutes' => 15,
    ]);

    $alert = Alert::create([
        'rule_id' => $rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'high',
        'status' => 'acknowledged',
        'triggered_at' => now(),
        'acknowledged_at' => now(),
    ]);

    Sanctum::actingAs($this->siteManager);

    $this->postJson("/api/alerts/{$alert->id}/resolve")
        ->assertOk()
        ->assertJsonPath('data.status', 'resolved');
});

test('site_viewer cannot resolve alerts', function () {
    $rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Test Rule',
        'type' => 'temperature_high',
        'conditions' => [],
        'severity' => 'high',
        'cooldown_minutes' => 15,
    ]);

    $alert = Alert::create([
        'rule_id' => $rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'high',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    Sanctum::actingAs($this->siteViewer);

    $this->postJson("/api/alerts/{$alert->id}/resolve")
        ->assertForbidden();
});

// ──────────────────────────────────────────────────────────────────────────
// Work Orders
// ──────────────────────────────────────────────────────────────────────────

test('work order list returns paginated work orders', function () {
    WorkOrder::create([
        'site_id' => $this->site->id,
        'title' => 'Replace battery',
        'type' => 'battery_replace',
        'priority' => 'high',
        'status' => 'open',
        'assigned_to' => $this->technician->id,
        'created_by' => $this->siteManager->id,
    ]);

    Sanctum::actingAs($this->siteManager);

    $this->getJson('/api/work-orders')
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'title', 'type', 'status', 'priority']]]);
});

test('work order list filters by assigned_to=me', function () {
    WorkOrder::create([
        'site_id' => $this->site->id,
        'title' => 'My WO',
        'type' => 'maintenance',
        'priority' => 'medium',
        'assigned_to' => $this->technician->id,
        'created_by' => $this->siteManager->id,
    ]);

    WorkOrder::create([
        'site_id' => $this->site->id,
        'title' => 'Other WO',
        'type' => 'maintenance',
        'priority' => 'medium',
        'assigned_to' => $this->siteManager->id,
        'created_by' => $this->siteManager->id,
    ]);

    Sanctum::actingAs($this->technician);

    $response = $this->getJson('/api/work-orders?assigned_to=me')
        ->assertOk();

    expect(count($response->json('data')))->toBe(1);
    expect($response->json('data.0.title'))->toBe('My WO');
});

test('work order detail returns photos and notes', function () {
    $wo = WorkOrder::create([
        'site_id' => $this->site->id,
        'title' => 'Replace battery',
        'type' => 'battery_replace',
        'priority' => 'high',
        'created_by' => $this->siteManager->id,
    ]);

    WorkOrderNote::create([
        'work_order_id' => $wo->id,
        'user_id' => $this->siteManager->id,
        'note' => 'Check device on second floor',
    ]);

    Sanctum::actingAs($this->siteManager);

    $this->getJson("/api/work-orders/{$wo->id}")
        ->assertOk()
        ->assertJsonStructure([
            'data' => ['id', 'title', 'status', 'photos', 'notes'],
        ]);
});

test('site_manager can create work order', function () {
    Sanctum::actingAs($this->siteManager);

    $this->postJson("/api/sites/{$this->site->id}/work-orders", [
        'title' => 'New maintenance task',
        'type' => 'maintenance',
        'priority' => 'high',
        'description' => 'Check all sensors in Zone A',
    ])
        ->assertCreated()
        ->assertJsonStructure(['data' => ['id', 'title', 'status']]);

    expect(WorkOrder::where('title', 'New maintenance task')->exists())->toBeTrue();
});

test('site_viewer cannot create work orders', function () {
    Sanctum::actingAs($this->siteViewer);

    $this->postJson("/api/sites/{$this->site->id}/work-orders", [
        'title' => 'Unauthorized WO',
        'type' => 'maintenance',
        'priority' => 'medium',
    ])
        ->assertForbidden();
});

test('technician cannot create work orders', function () {
    Sanctum::actingAs($this->technician);

    $this->postJson("/api/sites/{$this->site->id}/work-orders", [
        'title' => 'Unauthorized WO',
        'type' => 'maintenance',
        'priority' => 'medium',
    ])
        ->assertForbidden();
});

test('work order status can be updated through valid transitions', function () {
    $wo = WorkOrder::create([
        'site_id' => $this->site->id,
        'title' => 'Test WO',
        'type' => 'maintenance',
        'priority' => 'medium',
        'status' => 'open',
        'created_by' => $this->siteManager->id,
    ]);

    Sanctum::actingAs($this->technician);

    // open → in_progress
    $this->putJson("/api/work-orders/{$wo->id}/status", ['status' => 'in_progress'])
        ->assertOk()
        ->assertJsonPath('data.status', 'in_progress');

    // in_progress → completed
    $this->putJson("/api/work-orders/{$wo->id}/status", ['status' => 'completed'])
        ->assertOk()
        ->assertJsonPath('data.status', 'completed');
});

test('work order status rejects invalid transitions', function () {
    $wo = WorkOrder::create([
        'site_id' => $this->site->id,
        'title' => 'Test WO',
        'type' => 'maintenance',
        'priority' => 'medium',
        'status' => 'completed',
        'created_by' => $this->siteManager->id,
    ]);

    Sanctum::actingAs($this->siteManager);

    $this->putJson("/api/work-orders/{$wo->id}/status", ['status' => 'open'])
        ->assertUnprocessable();
});

test('can add note to work order', function () {
    $wo = WorkOrder::create([
        'site_id' => $this->site->id,
        'title' => 'Test WO',
        'type' => 'maintenance',
        'priority' => 'medium',
        'created_by' => $this->siteManager->id,
    ]);

    Sanctum::actingAs($this->technician);

    $this->postJson("/api/work-orders/{$wo->id}/notes", [
        'note' => 'Battery replaced successfully',
    ])
        ->assertCreated()
        ->assertJsonStructure(['data' => ['id', 'note', 'user']]);

    expect(WorkOrderNote::where('note', 'Battery replaced successfully')->exists())->toBeTrue();
});

test('can upload photo to work order', function () {
    Storage::fake('public');

    $wo = WorkOrder::create([
        'site_id' => $this->site->id,
        'title' => 'Test WO',
        'type' => 'maintenance',
        'priority' => 'medium',
        'created_by' => $this->siteManager->id,
    ]);

    Sanctum::actingAs($this->technician);

    $this->postJson("/api/work-orders/{$wo->id}/photos", [
        'photo' => UploadedFile::fake()->image('sensor.jpg'),
        'caption' => 'Before replacement',
    ])
        ->assertCreated()
        ->assertJsonStructure(['data' => ['id', 'photo_path', 'caption']]);

    expect(WorkOrderPhoto::where('caption', 'Before replacement')->exists())->toBeTrue();
});

// ──────────────────────────────────────────────────────────────────────────
// Notifications
// ──────────────────────────────────────────────────────────────────────────

test('notification list returns paginated notifications', function () {
    Sanctum::actingAs($this->siteManager);

    $this->getJson('/api/notifications')
        ->assertOk()
        ->assertJsonStructure(['data']);
});

test('mark all notifications as read', function () {
    Sanctum::actingAs($this->siteManager);

    $this->postJson('/api/notifications/mark-all-read')
        ->assertOk();
});

// ──────────────────────────────────────────────────────────────────────────
// Push Tokens
// ──────────────────────────────────────────────────────────────────────────

test('can register push token', function () {
    Sanctum::actingAs($this->technician);

    $this->postJson('/api/push-tokens', [
        'token' => 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        'device_name' => 'iPhone 15 Pro',
        'platform' => 'ios',
    ])
        ->assertCreated()
        ->assertJsonStructure(['data' => ['id', 'token', 'platform']]);

    expect(PushToken::where('token', 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]')->exists())->toBeTrue();
});

test('register push token upserts on duplicate', function () {
    Sanctum::actingAs($this->technician);

    $this->postJson('/api/push-tokens', [
        'token' => 'ExponentPushToken[duplicate]',
        'device_name' => 'Device 1',
        'platform' => 'ios',
    ])->assertCreated();

    $this->postJson('/api/push-tokens', [
        'token' => 'ExponentPushToken[duplicate]',
        'device_name' => 'Device 1 Renamed',
        'platform' => 'ios',
    ])->assertCreated();

    expect(PushToken::where('token', 'ExponentPushToken[duplicate]')->count())->toBe(1);
    expect(PushToken::where('token', 'ExponentPushToken[duplicate]')->first()->device_name)->toBe('Device 1 Renamed');
});

test('can unregister push token', function () {
    Sanctum::actingAs($this->technician);

    PushToken::create([
        'user_id' => $this->technician->id,
        'token' => 'ExponentPushToken[toremove]',
        'platform' => 'android',
    ]);

    $this->deleteJson('/api/push-tokens/ExponentPushToken[toremove]')
        ->assertOk();

    expect(PushToken::where('token', 'ExponentPushToken[toremove]')->exists())->toBeFalse();
});

test('cannot unregister another users push token', function () {
    PushToken::create([
        'user_id' => $this->siteManager->id,
        'token' => 'ExponentPushToken[other]',
        'platform' => 'ios',
    ]);

    Sanctum::actingAs($this->technician);

    $this->deleteJson('/api/push-tokens/ExponentPushToken[other]')
        ->assertNotFound();
});
