<?php

use App\Models\Organization;
use App\Models\Site;
use App\Models\SiteTemplate;
use App\Models\User;

beforeEach(function () {
    seedPermissions();
    $this->org = Organization::factory()->create();
    $this->site = Site::factory()->create(['org_id' => $this->org->id, 'status' => 'active']);

    $this->admin = User::factory()->create([
        'org_id' => $this->org->id,
        'privacy_accepted_at' => now(),
        'privacy_policy_version' => '1.0',
    ]);
    $this->admin->assignRole('org_admin');

    $this->viewer = User::factory()->create([
        'org_id' => $this->org->id,
        'privacy_accepted_at' => now(),
        'privacy_policy_version' => '1.0',
    ]);
    $this->viewer->assignRole('site_viewer');
});

test('org_admin can view site templates', function () {
    $this->actingAs($this->admin)
        ->get('/settings/site-templates')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/site-templates/index')->has('templates')->has('sites'));
});

test('site_viewer cannot view site templates', function () {
    $this->actingAs($this->viewer)
        ->get('/settings/site-templates')
        ->assertForbidden();
});

test('org_admin can create template from site', function () {
    $this->actingAs($this->admin)
        ->post('/settings/site-templates', [
            'source_site_id' => $this->site->id,
            'name' => 'Standard Store',
            'description' => 'Default configuration for retail stores',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertDatabaseHas('site_templates', [
        'org_id' => $this->org->id,
        'name' => 'Standard Store',
        'created_by' => $this->admin->id,
    ]);
});

test('create validates required fields', function () {
    $this->actingAs($this->admin)
        ->post('/settings/site-templates', [])
        ->assertSessionHasErrors(['source_site_id', 'name']);
});

test('org_admin can delete template', function () {
    $template = SiteTemplate::factory()->create([
        'org_id' => $this->org->id,
        'created_by' => $this->admin->id,
    ]);

    $this->actingAs($this->admin)
        ->delete("/settings/site-templates/{$template->id}")
        ->assertRedirect()
        ->assertSessionHas('success');

    $this->assertDatabaseMissing('site_templates', ['id' => $template->id]);
});

test('org_admin can apply template to site', function () {
    // Create template with empty modules to avoid SiteModule constraint
    $template = SiteTemplate::factory()->create([
        'org_id' => $this->org->id,
        'created_by' => $this->admin->id,
        'modules' => [],
    ]);
    $targetSite = Site::factory()->create(['org_id' => $this->org->id, 'status' => 'active']);

    $this->actingAs($this->admin)
        ->post("/settings/site-templates/{$template->id}/apply", [
            'site_id' => $targetSite->id,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');
});

test('apply validates site_id required', function () {
    $template = SiteTemplate::factory()->create([
        'org_id' => $this->org->id,
        'created_by' => $this->admin->id,
    ]);

    $this->actingAs($this->admin)
        ->post("/settings/site-templates/{$template->id}/apply", [])
        ->assertSessionHasErrors('site_id');
});

test('guest cannot access site templates', function () {
    $this->get('/settings/site-templates')->assertRedirect('/login');
});
