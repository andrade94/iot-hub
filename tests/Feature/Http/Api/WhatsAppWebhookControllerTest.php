<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\User;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->device = createDevice($this->site);

    $this->rule = AlertRule::create([
        'site_id' => $this->site->id,
        'name' => 'Test Rule',
        'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']],
        'severity' => 'high',
    ]);
});

test('ACK message acknowledges active alert', function () {
    $user = User::factory()->create(['org_id' => $this->org->id, 'whatsapp_phone' => '+5215551234567']);
    $user->assignRole('client_org_admin');

    $alert = Alert::create([
        'rule_id' => $this->rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'high',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $this->postJson('/api/whatsapp/webhook', [
        'Body' => 'ACK',
        'From' => 'whatsapp:+5215551234567',
    ])
        ->assertOk()
        ->assertJson(['status' => 'ok', 'action' => 'acknowledge']);

    expect($alert->fresh()->status)->toBe('acknowledged');
});

test('ESC message is handled', function () {
    $user = User::factory()->create(['org_id' => $this->org->id, 'whatsapp_phone' => '+5215559876543']);
    $user->assignRole('client_org_admin');

    Alert::create([
        'rule_id' => $this->rule->id,
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'severity' => 'critical',
        'status' => 'active',
        'triggered_at' => now(),
    ]);

    $this->postJson('/api/whatsapp/webhook', [
        'Body' => 'ESC',
        'From' => 'whatsapp:+5215559876543',
    ])
        ->assertOk()
        ->assertJson(['status' => 'ok', 'action' => 'escalate']);
});

test('unknown phone returns user_not_found', function () {
    $this->postJson('/api/whatsapp/webhook', [
        'Body' => 'ACK',
        'From' => 'whatsapp:+0000000000',
    ])
        ->assertNotFound()
        ->assertJson(['status' => 'user_not_found']);
});

test('no active alert returns no_active_alert', function () {
    $user = User::factory()->create(['org_id' => $this->org->id, 'whatsapp_phone' => '+5215551111111']);
    $user->assignRole('client_org_admin');

    $this->postJson('/api/whatsapp/webhook', [
        'Body' => 'ACK',
        'From' => 'whatsapp:+5215551111111',
    ])
        ->assertOk()
        ->assertJson(['status' => 'no_active_alert']);
});

test('unrecognized message is ignored', function () {
    $this->postJson('/api/whatsapp/webhook', [
        'Body' => 'Hello',
        'From' => 'whatsapp:+5215552222222',
    ])
        ->assertOk()
        ->assertJson(['status' => 'ignored']);
});
