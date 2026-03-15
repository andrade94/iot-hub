<?php

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
});

test('super_admin can access partner portal', function () {
    $superAdmin = createUserWithRole('super_admin');

    $this->actingAs($superAdmin)
        ->get(route('partner.index'))
        ->assertOk();
});

test('org_admin is forbidden from partner portal', function () {
    $orgAdmin = createUserWithRole('org_admin', $this->org);

    $this->actingAs($orgAdmin)
        ->get(route('partner.index'))
        ->assertForbidden();
});

test('guest is redirected from partner portal', function () {
    $this->get(route('partner.index'))
        ->assertRedirect(route('login'));
});
