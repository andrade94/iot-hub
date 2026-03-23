<?php

use App\Models\Organization;
use App\Models\Site;
use App\Models\User;

beforeEach(function () {
    seedPermissions();
    $this->org = Organization::factory()->create();
    $this->site = Site::factory()->create(['org_id' => $this->org->id]);

    $this->admin = User::factory()->create([
        'org_id' => $this->org->id,
        'privacy_accepted_at' => now(),
        'privacy_policy_version' => '1.0',
    ]);
    $this->admin->assignRole('org_admin');
    $this->admin->sites()->attach($this->site->id, ['assigned_at' => now(), 'assigned_by' => $this->admin->id]);
});

test('org_admin can access audit mode', function () {
    $this->actingAs($this->admin)
        ->get("/sites/{$this->site->id}/audit")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('sites/audit')
            ->has('summary')
            ->has('zones')
            ->has('excursions')
            ->has('correctiveActions')
            ->has('calibrations')
            ->has('monitoringGaps')
        );
});

test('audit mode returns correct summary structure', function () {
    $this->actingAs($this->admin)
        ->get("/sites/{$this->site->id}/audit?days=90")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('summary.total_devices')
            ->has('summary.total_excursions')
            ->has('summary.calibration_valid')
            ->has('summary.monitoring_gaps')
            ->where('days', 90)
        );
});

test('audit mode accepts different period', function () {
    $this->actingAs($this->admin)
        ->get("/sites/{$this->site->id}/audit?days=365")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('days', 365));
});

test('guest cannot access audit mode', function () {
    $this->get("/sites/{$this->site->id}/audit")->assertRedirect('/login');
});
