<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\MaintenanceWindow;
use App\Models\OutageDeclaration;
use App\Models\User;
use App\Services\Alerts\AlertRouter;
use App\Services\RulesEngine\RuleEvaluator;
use Carbon\Carbon;
use Illuminate\Support\Facades\Redis;

beforeEach(function () {
    // Flush Redis state between tests to clear RuleEvaluator's breach tracking, cooldowns, etc.
    try {
        Redis::flushdb();
    } catch (\Exception $e) {
        // Redis unavailable — tests will still work since RuleEvaluator catches Redis failures
    }

    $this->org = createOrg();
    $this->site = createSite($this->org, ['timezone' => 'UTC']);
    $this->user = User::factory()->create(['org_id' => $this->org->id]);

    $this->deviceA = createDevice($this->site, [
        'name' => 'Cooler A Sensor',
        'zone' => 'Zone A',
    ]);

    $this->deviceB = createDevice($this->site, [
        'name' => 'Cooler B Sensor',
        'zone' => 'Zone B',
    ]);

    // Create an alert rule that triggers immediately (duration_minutes=0) on temperature > 8
    $this->rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'High Temp Alert',
        'type' => 'simple',
        'conditions' => [
            [
                'metric' => 'temperature',
                'condition' => 'above',
                'threshold' => 8,
                'duration_minutes' => 0,
                'severity' => 'critical',
            ],
        ],
        'severity' => 'critical',
        'cooldown_minutes' => 0,
        'active' => true,
    ]);

    // Mock AlertRouter to prevent side effects (broadcasting, escalation jobs, Redis batch counters)
    $this->mock(AlertRouter::class, function ($mock) {
        $mock->shouldReceive('route')->zeroOrMoreTimes();
    });
});

// ── Suppression Chain Tests ──────────────────────────────────────────────

test('outage declaration suppresses all alert evaluation', function () {
    // Create an active outage declaration (global kill switch)
    OutageDeclaration::create([
        'reason' => 'Upstream provider outage',
        'affected_services' => ['alerts', 'notifications'],
        'status' => 'active',
        'declared_by' => $this->user->id,
        'declared_at' => now(),
    ]);

    $evaluator = app(RuleEvaluator::class);

    // Trigger a breach reading on device A — should be suppressed
    $evaluator->evaluate($this->deviceA, [
        'temperature' => ['value' => 15.0, 'unit' => '°C'],
    ]);

    // Trigger a breach reading on device B — should also be suppressed
    $evaluator->evaluate($this->deviceB, [
        'temperature' => ['value' => 20.0, 'unit' => '°C'],
    ]);

    expect(Alert::count())->toBe(0);
});

test('maintenance window suppresses alerts for matching zone', function () {
    $now = Carbon::now('UTC');

    // Create a maintenance window for Zone A only, active right now
    MaintenanceWindow::create([
        'site_id' => $this->site->id,
        'zone' => 'Zone A',
        'title' => 'Zone A Maintenance',
        'recurrence' => 'daily',
        'start_time' => $now->copy()->subMinutes(5)->format('H:i'),
        'duration_minutes' => 60,
        'suppress_alerts' => true,
        'created_by' => $this->user->id,
    ]);

    $evaluator = app(RuleEvaluator::class);

    // Device A is in Zone A — should be suppressed
    $evaluator->evaluate($this->deviceA, [
        'temperature' => ['value' => 15.0, 'unit' => '°C'],
    ]);

    expect(Alert::count())->toBe(0);

    // Device B is in Zone B — should NOT be suppressed
    $evaluator->evaluate($this->deviceB, [
        'temperature' => ['value' => 15.0, 'unit' => '°C'],
    ]);

    expect(Alert::count())->toBe(1);
    expect(Alert::first()->device_id)->toBe($this->deviceB->id);
});

test('site-wide maintenance window suppresses all zones', function () {
    $now = Carbon::now('UTC');

    // Create a maintenance window with zone=null (site-wide)
    MaintenanceWindow::create([
        'site_id' => $this->site->id,
        'zone' => null,
        'title' => 'Site-Wide Maintenance',
        'recurrence' => 'daily',
        'start_time' => $now->copy()->subMinutes(5)->format('H:i'),
        'duration_minutes' => 60,
        'suppress_alerts' => true,
        'created_by' => $this->user->id,
    ]);

    $evaluator = app(RuleEvaluator::class);

    // Both devices in different zones should be suppressed
    $evaluator->evaluate($this->deviceA, [
        'temperature' => ['value' => 15.0, 'unit' => '°C'],
    ]);

    $evaluator->evaluate($this->deviceB, [
        'temperature' => ['value' => 15.0, 'unit' => '°C'],
    ]);

    expect(Alert::count())->toBe(0);
});

test('outage takes precedence over maintenance window', function () {
    $now = Carbon::now('UTC');

    // Create both an active outage and a maintenance window
    $outage = OutageDeclaration::create([
        'reason' => 'Provider down',
        'affected_services' => ['alerts'],
        'status' => 'active',
        'declared_by' => $this->user->id,
        'declared_at' => now(),
    ]);

    MaintenanceWindow::create([
        'site_id' => $this->site->id,
        'zone' => null,
        'title' => 'Scheduled Maintenance',
        'recurrence' => 'daily',
        'start_time' => $now->copy()->subMinutes(5)->format('H:i'),
        'duration_minutes' => 60,
        'suppress_alerts' => true,
        'created_by' => $this->user->id,
    ]);

    $evaluator = app(RuleEvaluator::class);

    // Outage active — should suppress (outage precedes MW in chain)
    $evaluator->evaluate($this->deviceA, [
        'temperature' => ['value' => 15.0, 'unit' => '°C'],
    ]);

    expect(Alert::count())->toBe(0);

    // Resolve the outage
    $outage->resolve($this->user->id);

    expect(OutageDeclaration::isActive())->toBeFalse();

    // Maintenance window is still active — should still suppress
    $evaluator->evaluate($this->deviceA, [
        'temperature' => ['value' => 15.0, 'unit' => '°C'],
    ]);

    expect(Alert::count())->toBe(0);
});

test('normal evaluation fires alert when no suppression active', function () {
    // No outage, no maintenance window — just a clean evaluation
    $evaluator = app(RuleEvaluator::class);

    $evaluator->evaluate($this->deviceA, [
        'temperature' => ['value' => 15.0, 'unit' => '°C'],
    ]);

    expect(Alert::count())->toBe(1);

    $alert = Alert::first();
    expect($alert->device_id)->toBe($this->deviceA->id)
        ->and($alert->severity)->toBe('critical')
        ->and($alert->status)->toBe('active')
        ->and($alert->data['metric'])->toBe('temperature')
        ->and((float) $alert->data['value'])->toBe(15.0)
        ->and((float) $alert->data['threshold'])->toBe(8.0);
});

test('expired maintenance window does not suppress', function () {
    $now = Carbon::now('UTC');

    // Create a maintenance window that ended 1 hour ago
    // start_time was 2 hours ago, duration 30 minutes → ended 1.5 hours ago
    MaintenanceWindow::create([
        'site_id' => $this->site->id,
        'zone' => 'Zone A',
        'title' => 'Past Maintenance',
        'recurrence' => 'daily',
        'start_time' => $now->copy()->subHours(2)->format('H:i'),
        'duration_minutes' => 30,
        'suppress_alerts' => true,
        'created_by' => $this->user->id,
    ]);

    $evaluator = app(RuleEvaluator::class);

    // Device in Zone A — window has expired, alert should fire
    $evaluator->evaluate($this->deviceA, [
        'temperature' => ['value' => 15.0, 'unit' => '°C'],
    ]);

    expect(Alert::count())->toBe(1);
    expect(Alert::first()->device_id)->toBe($this->deviceA->id);
});
