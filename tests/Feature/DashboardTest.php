<?php

use App\Models\Organization;
use App\Models\User;

test('guests are redirected to the login page', function () {
    $this->get(route('dashboard'))->assertRedirect(route('login'));
});

test('authenticated users with an org can visit the dashboard', function () {
    $org = Organization::create([
        'name' => 'Test Org', 'slug' => 'test-org', 'segment' => 'cold_chain',
    ]);
    $user = User::factory()->create(['org_id' => $org->id]);

    $this->actingAs($user)->get(route('dashboard'))->assertOk();
});
