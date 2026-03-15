<?php

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->user = createUserWithRole('org_admin', $this->org);
    $this->device = createDevice($this->site);
});

test('org_admin can view device detail', function () {
    $this->actingAs($this->user)
        ->get("/devices/{$this->device->id}")
        ->assertOk();
});

test('device detail accepts period parameter', function () {
    $this->actingAs($this->user)
        ->get("/devices/{$this->device->id}?period=7d")
        ->assertOk();
});

test('device detail accepts metric parameter', function () {
    $this->actingAs($this->user)
        ->get("/devices/{$this->device->id}?metric=humidity")
        ->assertOk();
});

test('device detail with both parameters', function () {
    $this->actingAs($this->user)
        ->get("/devices/{$this->device->id}?period=30d&metric=temperature")
        ->assertOk();
});

test('guest is redirected from device detail', function () {
    $this->get("/devices/{$this->device->id}")
        ->assertRedirect(route('login'));
});
