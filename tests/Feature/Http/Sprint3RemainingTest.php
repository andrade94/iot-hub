<?php

use App\Models\DataExport;
use App\Models\ReportSchedule;
use App\Models\Site;
use App\Models\SiteTemplate;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    seedPermissions();
    $this->org = createOrg();
    $this->site = createSite($this->org);
});

// ── Feature 5: Alert Delivery Monitoring ──────────

test('command center includes delivery health data', function () {
    $user = createUserWithRole('super_admin', $this->org);

    $response = $this->actingAs($user)->get(route('command-center.index'));

    $response->assertOk();
    $props = $response->original->getData()['page']['props'];
    expect($props)->toHaveKey('deliveryHealth');
    expect($props['deliveryHealth'])->toHaveKeys(['whatsapp', 'push', 'email']);
});

// ── Feature 6: Scheduled Report Delivery ──────────

test('org_admin can view report schedules', function () {
    $user = createUserWithRole('client_org_admin', $this->org);
    $user->sites()->attach($this->site);

    $response = $this->actingAs($user)->get(route('report-schedules.index'));

    $response->assertOk();
});

test('org_admin can create report schedule', function () {
    $user = createUserWithRole('client_org_admin', $this->org);
    $user->sites()->attach($this->site);

    $response = $this->actingAs($user)->post(route('report-schedules.store'), [
        'type' => 'temperature_compliance',
        'frequency' => 'weekly',
        'day_of_week' => 1,
        'time' => '08:00',
        'recipients_json' => ['admin@example.com'],
    ]);

    $response->assertRedirect();
    expect(ReportSchedule::count())->toBe(1);
    expect(ReportSchedule::first()->type)->toBe('temperature_compliance');
    expect(ReportSchedule::first()->recipients_json)->toBe(['admin@example.com']);
});

test('org_admin can delete report schedule', function () {
    $user = createUserWithRole('client_org_admin', $this->org);

    $schedule = ReportSchedule::create([
        'org_id' => $this->org->id,
        'type' => 'energy_summary',
        'frequency' => 'daily',
        'time' => '08:00',
        'recipients_json' => ['test@example.com'],
        'created_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->delete(route('report-schedules.destroy', $schedule));

    $response->assertRedirect();
    expect(ReportSchedule::count())->toBe(0);
});

test('schedule shouldFireToday for weekly matches day', function () {
    $user = createUserWithRole('client_org_admin', $this->org);
    $today = now()->dayOfWeek;

    $schedule = ReportSchedule::create([
        'org_id' => $this->org->id,
        'type' => 'temperature_compliance',
        'frequency' => 'weekly',
        'day_of_week' => $today,
        'time' => '08:00',
        'recipients_json' => ['test@example.com'],
        'active' => true,
        'created_by' => $user->id,
    ]);

    expect($schedule->shouldFireToday())->toBeTrue();

    $schedule->update(['day_of_week' => ($today + 3) % 7]);
    expect($schedule->fresh()->shouldFireToday())->toBeFalse();
});

// ── Feature 7: Data Export ──────────

test('org_admin can view data export page', function () {
    $user = createUserWithRole('client_org_admin', $this->org);
    $user->sites()->attach($this->site);

    $response = $this->actingAs($user)->get(route('export-data.index'));

    $response->assertOk();
});

test('org_admin can request data export', function () {
    Queue::fake();

    $user = createUserWithRole('client_org_admin', $this->org);
    $user->sites()->attach($this->site);

    $response = $this->actingAs($user)->post(route('export-data.store'), [
        'date_from' => '2026-01-01',
        'date_to' => '2026-03-20',
    ]);

    $response->assertRedirect();
    expect(DataExport::count())->toBe(1);
    expect(DataExport::first()->status)->toBe('queued');

    Queue::assertPushed(\App\Jobs\ExportOrganizationData::class);
});

test('rate limit prevents duplicate active exports', function () {
    $user = createUserWithRole('client_org_admin', $this->org);
    $user->sites()->attach($this->site);

    DataExport::create([
        'org_id' => $this->org->id,
        'status' => 'processing',
        'requested_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->post(route('export-data.store'));

    $response->assertStatus(422);
});

test('data export state machine transitions', function () {
    $user = createUserWithRole('client_org_admin', $this->org);

    $export = DataExport::create([
        'org_id' => $this->org->id,
        'status' => 'queued',
        'requested_by' => $user->id,
    ]);

    expect($export->canTransitionTo('processing'))->toBeTrue();
    expect($export->canTransitionTo('completed'))->toBeFalse();

    $export->markProcessing();
    expect($export->status)->toBe('processing');
    expect($export->canTransitionTo('completed'))->toBeTrue();
    expect($export->canTransitionTo('queued'))->toBeFalse();

    $export->markCompleted('test.zip', 1024);
    expect($export->status)->toBe('completed');
    expect($export->expires_at)->not->toBeNull();
});

// ── Feature 8: Site Templates ──────────

test('org_admin can view site templates', function () {
    $user = createUserWithRole('client_org_admin', $this->org);
    $user->sites()->attach($this->site);

    $response = $this->actingAs($user)->get(route('site-templates.index'));

    $response->assertOk();
});

test('org_admin can create template from source site', function () {
    $user = createUserWithRole('client_org_admin', $this->org);
    $user->sites()->attach($this->site);

    $response = $this->actingAs($user)->post(route('site-templates.store'), [
        'source_site_id' => $this->site->id,
        'name' => 'Standard Cold Chain',
        'description' => 'Template for cold chain sites',
    ]);

    $response->assertRedirect();
    expect(SiteTemplate::count())->toBe(1);
    expect(SiteTemplate::first()->name)->toBe('Standard Cold Chain');
    expect(SiteTemplate::first()->modules)->toBeArray();
});

test('org_admin can delete template', function () {
    $user = createUserWithRole('client_org_admin', $this->org);

    $template = SiteTemplate::create([
        'org_id' => $this->org->id,
        'name' => 'To Delete',
        'modules' => [],
        'created_by' => $user->id,
    ]);

    $response = $this->actingAs($user)->delete(route('site-templates.destroy', $template));

    $response->assertRedirect();
    expect(SiteTemplate::count())->toBe(0);
});

test('template name must be unique per org', function () {
    $user = createUserWithRole('client_org_admin', $this->org);
    $user->sites()->attach($this->site);

    SiteTemplate::create([
        'org_id' => $this->org->id,
        'name' => 'Duplicate Name',
        'modules' => [],
        'created_by' => $user->id,
    ]);

    // Creating another with same name should fail at DB level
    $this->expectException(\Illuminate\Database\QueryException::class);
    SiteTemplate::create([
        'org_id' => $this->org->id,
        'name' => 'Duplicate Name',
        'modules' => [],
        'created_by' => $user->id,
    ]);
});

test('site_viewer cannot manage templates', function () {
    $user = createUserWithRole('client_site_viewer', $this->org);
    $user->sites()->attach($this->site);

    $response = $this->actingAs($user)->get(route('site-templates.index'));

    $response->assertForbidden();
});
