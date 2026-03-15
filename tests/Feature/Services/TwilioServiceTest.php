<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\User;
use App\Services\WhatsApp\TwilioService;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->device = createDevice($this->site);
    $this->service = new TwilioService;

    config(['services.twilio.account_sid' => 'AC_TEST']);
    config(['services.twilio.auth_token' => 'test_token']);
    config(['services.twilio.whatsapp_from' => '+14155551234']);
});

test('sendAlert succeeds with valid phone', function () {
    Http::fake(['api.twilio.com/*' => Http::response(['sid' => 'SM123'], 201)]);

    $rule = AlertRule::create(['site_id' => $this->site->id, 'name' => 'Rule', 'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']], 'severity' => 'high']);
    $alert = Alert::create(['rule_id' => $rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'active', 'triggered_at' => now()]);
    $user = User::factory()->create(['org_id' => $this->org->id, 'whatsapp_phone' => '+5215551234567']);

    // Need to reinitialize with new config
    $service = new TwilioService;
    $result = $service->sendAlert($alert, $user);

    expect($result)->toBeTrue();
});

test('sendAlert fails when user has no phone', function () {
    $rule = AlertRule::create(['site_id' => $this->site->id, 'name' => 'Rule', 'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']], 'severity' => 'high']);
    $alert = Alert::create(['rule_id' => $rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'active', 'triggered_at' => now()]);
    $user = User::factory()->create(['org_id' => $this->org->id, 'whatsapp_phone' => null]);

    $result = $this->service->sendAlert($alert, $user);

    expect($result)->toBeFalse();
});

test('processWebhook parses ACK', function () {
    $result = $this->service->processWebhook([
        'Body' => 'ACK',
        'From' => 'whatsapp:+5215551234567',
    ]);

    expect($result)->toBe(['action' => 'acknowledge', 'phone' => '+5215551234567']);
});

test('processWebhook parses ESC', function () {
    $result = $this->service->processWebhook([
        'Body' => 'ESC',
        'From' => 'whatsapp:+5215559876543',
    ]);

    expect($result)->toBe(['action' => 'escalate', 'phone' => '+5215559876543']);
});

test('processWebhook returns null for unrecognized message', function () {
    $result = $this->service->processWebhook([
        'Body' => 'Hello',
        'From' => 'whatsapp:+5215551234567',
    ]);

    expect($result)->toBeNull();
});
