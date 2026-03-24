<?php

use App\Models\EscalationChain;
use App\Models\Organization;
use App\Models\Site;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\Users\UserDeactivationService;

beforeEach(function () {
    seedPermissions();
    $this->org = Organization::factory()->create();
    $this->site = Site::factory()->create(['org_id' => $this->org->id]);

    $this->admin = User::factory()->create([
        'org_id' => $this->org->id,
        'privacy_accepted_at' => now(),
        'privacy_policy_version' => '1.0',
    ]);
    $this->admin->assignRole('client_org_admin');

    $this->tech = User::factory()->create([
        'org_id' => $this->org->id,
        'privacy_accepted_at' => now(),
        'privacy_policy_version' => '1.0',
    ]);
    $this->tech->assignRole('technician');
    $this->tech->sites()->attach($this->site->id, [
        'assigned_at' => now(),
        'assigned_by' => $this->admin->id,
    ]);
});

test('deactivation sets deactivated_at timestamp', function () {
    $service = new UserDeactivationService;
    $service->deactivate($this->tech, $this->admin);

    expect($this->tech->fresh()->deactivated_at)->not->toBeNull();
    expect($this->tech->fresh()->isDeactivated())->toBeTrue();
});

test('deactivation reassigns open work orders', function () {
    $wo1 = WorkOrder::factory()->create(['site_id' => $this->site->id, 'assigned_to' => $this->tech->id, 'status' => 'assigned']);
    $wo2 = WorkOrder::factory()->create(['site_id' => $this->site->id, 'assigned_to' => $this->tech->id, 'status' => 'in_progress']);
    $wo3 = WorkOrder::factory()->create(['site_id' => $this->site->id, 'assigned_to' => $this->tech->id, 'status' => 'completed']);

    $service = new UserDeactivationService;
    $result = $service->deactivate($this->tech, $this->admin);

    expect($result['work_orders_reassigned'])->toBe(2);
    expect($wo1->fresh()->assigned_to)->toBeNull();
    expect($wo1->fresh()->status)->toBe('open');
    expect($wo2->fresh()->assigned_to)->toBeNull();
    expect($wo3->fresh()->assigned_to)->toBe($this->tech->id); // completed unchanged
});

test('deactivation removes user from escalation chains', function () {
    $chain = EscalationChain::factory()->create([
        'site_id' => $this->site->id,
        'levels' => [
            ['level' => 1, 'user_ids' => [$this->tech->id, $this->admin->id], 'channels' => ['push'], 'delay_minutes' => 0],
        ],
    ]);

    $service = new UserDeactivationService;
    $result = $service->deactivate($this->tech, $this->admin);

    expect($result['escalation_gaps'])->toBe(1);
    $chain->refresh();
    expect($chain->levels[0]['user_ids'])->not->toContain($this->tech->id);
    expect($chain->levels[0]['user_ids'])->toContain($this->admin->id);
});

test('reactivation clears deactivated_at', function () {
    $this->tech->update(['deactivated_at' => now()]);

    $service = new UserDeactivationService;
    $service->reactivate($this->tech, $this->admin);

    expect($this->tech->fresh()->deactivated_at)->toBeNull();
    expect($this->tech->fresh()->isDeactivated())->toBeFalse();
});

test('cannot deactivate self via controller', function () {
    $this->actingAs($this->admin)
        ->post("/settings/users/{$this->admin->id}/deactivate")
        ->assertRedirect()
        ->assertSessionHas('error');

    expect($this->admin->fresh()->deactivated_at)->toBeNull();
});

test('org_admin can deactivate technician via controller', function () {
    $this->actingAs($this->admin)
        ->post("/settings/users/{$this->tech->id}/deactivate")
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($this->tech->fresh()->isDeactivated())->toBeTrue();
});

test('org_admin can reactivate user via controller', function () {
    $this->tech->update(['deactivated_at' => now()]);

    $this->actingAs($this->admin)
        ->post("/settings/users/{$this->tech->id}/reactivate")
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($this->tech->fresh()->isDeactivated())->toBeFalse();
});

test('active scope excludes deactivated users', function () {
    $this->tech->update(['deactivated_at' => now()]);

    $activeUsers = User::where('org_id', $this->org->id)->active()->get();

    expect($activeUsers->contains($this->tech))->toBeFalse();
    expect($activeUsers->contains($this->admin))->toBeTrue();
});
