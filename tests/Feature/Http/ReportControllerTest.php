<?php

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->user = createUserWithRole('client_org_admin', $this->org);
});

test('org_admin can view temperature report', function () {
    $this->actingAs($this->user)
        ->get(route('reports.temperature', $this->site))
        ->assertOk();
});

test('temperature report accepts date range', function () {
    $this->actingAs($this->user)
        ->get(route('reports.temperature', ['site' => $this->site, 'from' => '2026-03-01', 'to' => '2026-03-15']))
        ->assertOk();
});

test('org_admin can view energy report', function () {
    $this->actingAs($this->user)
        ->get(route('reports.energy', $this->site))
        ->assertOk();
});

test('energy report accepts date range', function () {
    $this->actingAs($this->user)
        ->get(route('reports.energy', ['site' => $this->site, 'from' => '2026-02-01', 'to' => '2026-03-01']))
        ->assertOk();
});

test('org_admin can view summary report', function () {
    $this->actingAs($this->user)
        ->get(route('reports.summary', $this->site))
        ->assertOk();
});

test('guest is redirected from reports', function () {
    $this->get(route('reports.temperature', $this->site))
        ->assertRedirect(route('login'));
});
