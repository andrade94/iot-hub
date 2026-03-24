<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Services\Alerts\AlertAnalyticsService;

beforeEach(function () {
    seedPermissions();
    $this->org = createOrg();
    $this->site = createSite($this->org);
});

test('org_admin can view alert analytics page', function () {
    $user = createUserWithRole('client_org_admin', $this->org);
    $user->sites()->attach($this->site);

    $response = $this->actingAs($user)->get(route('analytics.alerts'));

    $response->assertOk();
});

test('site_viewer cannot view alert analytics', function () {
    $user = createUserWithRole('client_site_viewer', $this->org);
    $user->sites()->attach($this->site);

    $response = $this->actingAs($user)->get(route('analytics.alerts'));

    $response->assertForbidden();
});

test('summary returns correct counts', function () {
    $device = createDevice($this->site);
    $rule = AlertRule::factory()->create(['site_id' => $this->site->id]);

    // Create 5 alerts: 2 dismissed, 1 auto-resolved, 2 active
    Alert::factory()->create(['site_id' => $this->site->id, 'device_id' => $device->id, 'rule_id' => $rule->id, 'resolution_type' => 'dismissed', 'resolved_at' => now()]);
    Alert::factory()->create(['site_id' => $this->site->id, 'device_id' => $device->id, 'rule_id' => $rule->id, 'resolution_type' => 'dismissed', 'resolved_at' => now()]);
    Alert::factory()->create(['site_id' => $this->site->id, 'device_id' => $device->id, 'rule_id' => $rule->id, 'resolution_type' => 'auto', 'resolved_at' => now()]);
    Alert::factory()->create(['site_id' => $this->site->id, 'device_id' => $device->id, 'rule_id' => $rule->id, 'status' => 'active']);
    Alert::factory()->create(['site_id' => $this->site->id, 'device_id' => $device->id, 'rule_id' => $rule->id, 'status' => 'active']);

    $service = new AlertAnalyticsService(siteId: $this->site->id, days: 30);
    $summary = $service->getSummary();

    expect($summary['total_alerts'])->toBe(5);
    expect($summary['dismissal_rate'])->toBe(40.0); // 2/5
    expect($summary['auto_resolved_pct'])->toBe(20.0); // 1/5
});

test('noisiest rules sorted by alert count', function () {
    $device = createDevice($this->site);
    $ruleA = AlertRule::factory()->create(['site_id' => $this->site->id, 'name' => 'Rule A']);
    $ruleB = AlertRule::factory()->create(['site_id' => $this->site->id, 'name' => 'Rule B']);

    // Rule A: 5 alerts
    for ($i = 0; $i < 5; $i++) {
        Alert::factory()->create(['site_id' => $this->site->id, 'device_id' => $device->id, 'rule_id' => $ruleA->id]);
    }
    // Rule B: 2 alerts
    for ($i = 0; $i < 2; $i++) {
        Alert::factory()->create(['site_id' => $this->site->id, 'device_id' => $device->id, 'rule_id' => $ruleB->id]);
    }

    $service = new AlertAnalyticsService(siteId: $this->site->id, days: 30);
    $rules = $service->getNoisiestRules();

    expect($rules)->toHaveCount(2);
    expect($rules[0]['rule_name'])->toBe('Rule A');
    expect($rules[0]['alert_count'])->toBe(5);
    expect($rules[1]['rule_name'])->toBe('Rule B');
    expect($rules[1]['alert_count'])->toBe(2);
});

test('resolution breakdown returns correct split', function () {
    $device = createDevice($this->site);
    $rule = AlertRule::factory()->create(['site_id' => $this->site->id]);

    Alert::factory()->create(['site_id' => $this->site->id, 'device_id' => $device->id, 'rule_id' => $rule->id, 'resolution_type' => 'auto', 'resolved_at' => now()]);
    Alert::factory()->create(['site_id' => $this->site->id, 'device_id' => $device->id, 'rule_id' => $rule->id, 'resolution_type' => 'manual', 'resolved_at' => now()]);
    Alert::factory()->create(['site_id' => $this->site->id, 'device_id' => $device->id, 'rule_id' => $rule->id, 'resolution_type' => 'dismissed', 'resolved_at' => now()]);

    $service = new AlertAnalyticsService(siteId: $this->site->id, days: 30);
    $breakdown = $service->getResolutionBreakdown();

    expect($breakdown['auto'])->toBe(1);
    expect($breakdown['manual'])->toBe(1);
    expect($breakdown['dismissed'])->toBe(1);
    expect($breakdown['work_order'])->toBe(0);
});

test('site filter scopes data correctly', function () {
    $site2 = createSite($this->org);
    $device1 = createDevice($this->site);
    $device2 = createDevice($site2);
    $rule = AlertRule::factory()->create(['site_id' => $this->site->id]);
    $rule2 = AlertRule::factory()->create(['site_id' => $site2->id]);

    Alert::factory()->count(3)->create(['site_id' => $this->site->id, 'device_id' => $device1->id, 'rule_id' => $rule->id]);
    Alert::factory()->count(7)->create(['site_id' => $site2->id, 'device_id' => $device2->id, 'rule_id' => $rule2->id]);

    $service = new AlertAnalyticsService(siteId: $this->site->id, days: 30);
    expect($service->getSummary()['total_alerts'])->toBe(3);

    $serviceAll = new AlertAnalyticsService(orgId: $this->org->id, days: 30);
    expect($serviceAll->getSummary()['total_alerts'])->toBe(10);
});

test('guest is redirected from analytics', function () {
    $response = $this->get(route('analytics.alerts'));

    $response->assertRedirect(route('login'));
});
