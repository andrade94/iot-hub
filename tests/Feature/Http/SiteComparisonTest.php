<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\Device;
use App\Models\Organization;
use App\Models\Site;
use App\Models\User;

beforeEach(function () {
    seedPermissions();
    $this->org = Organization::factory()->create();
    $this->site1 = Site::factory()->create(['org_id' => $this->org->id, 'name' => 'Site A']);
    $this->site2 = Site::factory()->create(['org_id' => $this->org->id, 'name' => 'Site B']);

    $this->admin = User::factory()->create([
        'org_id' => $this->org->id,
        'privacy_accepted_at' => now(),
        'privacy_policy_version' => '1.0',
    ]);
    $this->admin->assignRole('client_org_admin');
});

test('org_admin can access site comparison page', function () {
    $this->actingAs($this->admin)
        ->get('/sites/compare')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('sites/compare')
            ->has('rankings')
            ->has('sites')
        );
});

test('site comparison returns rankings sorted by metric', function () {
    $rule = AlertRule::factory()->create(['site_id' => $this->site1->id]);
    $device = Device::factory()->create(['site_id' => $this->site1->id]);

    // Site A: 3 alerts, 2 resolved = 66% compliance
    Alert::factory(2)->create(['site_id' => $this->site1->id, 'device_id' => $device->id, 'rule_id' => $rule->id, 'status' => 'resolved']);
    Alert::factory()->create(['site_id' => $this->site1->id, 'device_id' => $device->id, 'rule_id' => $rule->id, 'status' => 'active']);

    // Site B: 0 alerts = 100% compliance
    $this->actingAs($this->admin)
        ->get('/sites/compare?metric=compliance&days=30')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('rankings', 2)
            ->where('rankings.0.site_name', 'Site B') // 100% first
            ->where('rankings.1.site_name', 'Site A') // 66% second
        );
});

test('site comparison accepts different metrics', function () {
    $this->actingAs($this->admin)
        ->get('/sites/compare?metric=device_uptime&days=90')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('metric', 'device_uptime')->where('days', 90));
});

test('performance dashboard accessible by org_admin', function () {
    $this->actingAs($this->admin)
        ->get('/analytics/performance')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('analytics/performance')
            ->has('summary')
            ->has('trend')
            ->has('siteBreakdown')
        );
});

test('performance dashboard returns correct KPI structure', function () {
    $this->actingAs($this->admin)
        ->get('/analytics/performance?days=30')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('summary.total_alerts')
            ->has('summary.resolved_pct')
            ->has('summary.avg_response_minutes')
            ->has('summary.device_uptime_pct')
        );
});

test('guest cannot access comparison or performance pages', function () {
    $this->get('/sites/compare')->assertRedirect('/login');
    $this->get('/analytics/performance')->assertRedirect('/login');
});
