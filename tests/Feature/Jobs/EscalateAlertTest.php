<?php

use App\Jobs\EscalateAlert;
use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\EscalationChain;
use App\Models\User;
use App\Services\Alerts\EscalationService;

beforeEach(function () {
    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->device = createDevice($this->site);
});

test('delegates to EscalationService', function () {
    $rule = AlertRule::create(['site_id' => $this->site->id, 'name' => 'Rule', 'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']], 'severity' => 'high']);
    $alert = Alert::create(['rule_id' => $rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'active', 'triggered_at' => now()]);
    $user = User::factory()->create(['org_id' => $this->org->id]);
    $chain = EscalationChain::create(['site_id' => $this->site->id, 'user_id' => $user->id, 'level' => 2, 'delay_minutes' => 5, 'channel' => 'whatsapp']);

    $service = Mockery::mock(EscalationService::class);
    $service->shouldReceive('escalate')
        ->once()
        ->with(
            Mockery::on(fn ($a) => $a->id === $alert->id),
            Mockery::on(fn ($c) => $c->id === $chain->id),
        );

    (new EscalateAlert($alert, $chain))->handle($service);
});

test('job has correct retry config', function () {
    $rule = AlertRule::create(['site_id' => $this->site->id, 'name' => 'Rule', 'conditions' => [['metric' => 'temperature', 'condition' => 'above', 'threshold' => 8, 'duration_minutes' => 5, 'severity' => 'high']], 'severity' => 'high']);
    $alert = Alert::create(['rule_id' => $rule->id, 'site_id' => $this->site->id, 'device_id' => $this->device->id, 'severity' => 'high', 'status' => 'active', 'triggered_at' => now()]);
    $user = User::factory()->create(['org_id' => $this->org->id]);
    $chain = EscalationChain::create(['site_id' => $this->site->id, 'user_id' => $user->id, 'level' => 1, 'delay_minutes' => 0, 'channel' => 'push']);

    $job = new EscalateAlert($alert, $chain);

    expect($job->tries)->toBe(2);
    expect($job->backoff)->toBe(60);
});
