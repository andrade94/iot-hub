<?php

use App\Models\Module;
use App\Models\Recipe;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->user = createUserWithRole('org_admin', $this->org);
});

test('authenticated user can list recipes', function () {
    $module = Module::create(['slug' => 'cold-chain', 'name' => 'Cold Chain']);
    Recipe::create(['module_id' => $module->id, 'sensor_model' => 'EM300-TH', 'name' => 'Freezer Recipe', 'default_rules' => []]);

    $this->actingAs($this->user)
        ->get(route('recipes.index'))
        ->assertOk();
});

test('authenticated user can view a recipe', function () {
    $module = Module::create(['slug' => 'cold-chain', 'name' => 'Cold Chain']);
    $recipe = Recipe::create(['module_id' => $module->id, 'sensor_model' => 'EM300-TH', 'name' => 'Freezer Recipe', 'default_rules' => []]);

    $this->actingAs($this->user)
        ->get(route('recipes.show', $recipe))
        ->assertOk();
});

test('guest is redirected from recipes', function () {
    $this->get(route('recipes.index'))
        ->assertRedirect(route('login'));
});
