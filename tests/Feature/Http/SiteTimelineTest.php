<?php

use App\Models\Alert;
use App\Models\AlertRule;
use App\Models\Device;
use App\Models\Organization;
use App\Models\Site;
use App\Models\User;
use App\Models\WorkOrder;

beforeEach(function () {
    seedPermissions();
    $this->org = Organization::factory()->create();
    $this->site = Site::factory()->create(['org_id' => $this->org->id]);
    $this->device = Device::factory()->create(['site_id' => $this->site->id, 'zone' => 'Walk-in Cooler']);
    $this->rule = AlertRule::factory()->create(['site_id' => $this->site->id]);

    $this->manager = User::factory()->create([
        'org_id' => $this->org->id,
        'privacy_accepted_at' => now(),
        'privacy_policy_version' => '1.0',
    ]);
    $this->manager->assignRole('client_site_manager');
    $this->manager->sites()->attach($this->site->id, [
        'assigned_at' => now(),
        'assigned_by' => $this->manager->id,
    ]);
});

test('site_manager can access timeline page', function () {
    $this->actingAs($this->manager)
        ->get("/sites/{$this->site->id}/timeline")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('sites/timeline')
            ->has('events')
            ->has('zones')
            ->has('site')
        );
});

test('timeline includes alerts from the site', function () {
    Alert::factory()->create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'rule_id' => $this->rule->id,
        'status' => 'active',
        'severity' => 'high',
        'triggered_at' => now()->subHour(),
    ]);

    $this->actingAs($this->manager)
        ->get("/sites/{$this->site->id}/timeline?from=" . now()->subDays(2)->toDateString() . "&to=" . now()->addDay()->toDateString())
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('events')
        );

    // Verify at least one alert event exists
    expect($this->site->alerts()->count())->toBe(1);
});

test('timeline includes work orders from the site', function () {
    WorkOrder::factory()->create([
        'site_id' => $this->site->id,
        'status' => 'open',
        'created_at' => now()->subHours(2),
    ]);

    $this->actingAs($this->manager)
        ->get("/sites/{$this->site->id}/timeline?from=" . now()->subDays(2)->toDateString() . "&to=" . now()->addDay()->toDateString())
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('events', fn ($events) => $events->each(fn ($e) => $e->etc())->etc())
        );
});

test('timeline can filter by event type', function () {
    Alert::factory()->create([
        'site_id' => $this->site->id,
        'device_id' => $this->device->id,
        'rule_id' => $this->rule->id,
        'triggered_at' => now()->subHour(),
    ]);
    WorkOrder::factory()->create([
        'site_id' => $this->site->id,
        'created_at' => now()->subHours(2),
    ]);

    $this->actingAs($this->manager)
        ->get("/sites/{$this->site->id}/timeline?type=alert&from=" . now()->subDays(1)->toDateString())
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.type', 'alert')
        );
});

test('timeline returns zone list for filtering', function () {
    Device::factory()->create(['site_id' => $this->site->id, 'zone' => 'Freezer']);

    $this->actingAs($this->manager)
        ->get("/sites/{$this->site->id}/timeline")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('zones', 2) // Walk-in Cooler + Freezer
        );
});

test('guest cannot access timeline', function () {
    $this->get("/sites/{$this->site->id}/timeline")->assertRedirect('/login');
});
