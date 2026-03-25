<?php

// Covers: WF-POLICY — ReportSchedulePolicy, SiteTemplatePolicy, DataExportPolicy, MaintenanceWindowPolicy

use App\Models\DataExport;
use App\Models\MaintenanceWindow;
use App\Models\ReportSchedule;
use App\Models\SiteTemplate;

beforeEach(function () {
    seedPermissions();

    $this->org = createOrg();
    $this->site = createSite($this->org);

    $this->admin = createUserWithRole('client_org_admin', $this->org);
    $this->viewer = createUserWithRole('client_site_viewer', $this->org);
    $this->superAdmin = createUserWithRole('super_admin');

    $this->otherOrg = createOrg(['name' => 'Other Org']);
    $this->otherAdmin = createUserWithRole('client_org_admin', $this->otherOrg);
});

// ── ReportSchedulePolicy ───────────────────────────────────────

test('org_admin with permission can viewAny report schedules', function () {
    expect($this->admin->can('viewAny', ReportSchedule::class))->toBeTrue();
});

test('org_admin with permission can create report schedule', function () {
    expect($this->admin->can('create', ReportSchedule::class))->toBeTrue();
});

test('site_viewer cannot viewAny report schedules', function () {
    expect($this->viewer->can('viewAny', ReportSchedule::class))->toBeFalse();
});

test('site_viewer cannot create report schedule', function () {
    expect($this->viewer->can('create', ReportSchedule::class))->toBeFalse();
});

test('org_admin can view own org report schedule', function () {
    $schedule = ReportSchedule::create([
        'org_id' => $this->org->id,
        'type' => 'temperature_compliance',
        'frequency' => 'daily',
        'time' => '08:00',
        'recipients_json' => ['test@example.com'],
        'active' => true,
        'created_by' => $this->admin->id,
    ]);

    expect($this->admin->can('view', $schedule))->toBeTrue();
});

test('org_admin cannot view other org report schedule', function () {
    $schedule = ReportSchedule::create([
        'org_id' => $this->otherOrg->id,
        'type' => 'temperature_compliance',
        'frequency' => 'daily',
        'time' => '08:00',
        'recipients_json' => ['test@example.com'],
        'active' => true,
        'created_by' => $this->otherAdmin->id,
    ]);

    expect($this->admin->can('view', $schedule))->toBeFalse();
});

test('super_admin can view any org report schedule', function () {
    $schedule = ReportSchedule::create([
        'org_id' => $this->otherOrg->id,
        'type' => 'energy_summary',
        'frequency' => 'weekly',
        'time' => '09:00',
        'recipients_json' => ['admin@example.com'],
        'active' => true,
        'created_by' => $this->otherAdmin->id,
    ]);

    expect($this->superAdmin->can('view', $schedule))->toBeTrue();
});

test('org_admin can delete own org report schedule', function () {
    $schedule = ReportSchedule::create([
        'org_id' => $this->org->id,
        'type' => 'temperature_compliance',
        'frequency' => 'daily',
        'time' => '08:00',
        'recipients_json' => ['test@example.com'],
        'active' => true,
        'created_by' => $this->admin->id,
    ]);

    expect($this->admin->can('delete', $schedule))->toBeTrue();
});

test('org_admin cannot delete other org report schedule', function () {
    $schedule = ReportSchedule::create([
        'org_id' => $this->otherOrg->id,
        'type' => 'temperature_compliance',
        'frequency' => 'daily',
        'time' => '08:00',
        'recipients_json' => ['test@example.com'],
        'active' => true,
        'created_by' => $this->otherAdmin->id,
    ]);

    expect($this->admin->can('delete', $schedule))->toBeFalse();
});

// ── SiteTemplatePolicy ─────────────────────────────────────────

test('org_admin with permission can viewAny site templates', function () {
    expect($this->admin->can('viewAny', SiteTemplate::class))->toBeTrue();
});

test('site_viewer cannot viewAny site templates', function () {
    expect($this->viewer->can('viewAny', SiteTemplate::class))->toBeFalse();
});

test('org_admin can view own org site template', function () {
    $template = SiteTemplate::create([
        'org_id' => $this->org->id,
        'name' => 'Standard Store',
        'modules' => [],
        'created_by' => $this->admin->id,
    ]);

    expect($this->admin->can('view', $template))->toBeTrue();
});

test('org_admin cannot view other org site template', function () {
    $template = SiteTemplate::create([
        'org_id' => $this->otherOrg->id,
        'name' => 'Other Template',
        'modules' => [],
        'created_by' => $this->otherAdmin->id,
    ]);

    expect($this->admin->can('view', $template))->toBeFalse();
});

test('super_admin can view any org site template', function () {
    $template = SiteTemplate::create([
        'org_id' => $this->otherOrg->id,
        'name' => 'Cross-org Template',
        'modules' => [],
        'created_by' => $this->otherAdmin->id,
    ]);

    expect($this->superAdmin->can('view', $template))->toBeTrue();
});

test('org_admin can delete own org site template', function () {
    $template = SiteTemplate::create([
        'org_id' => $this->org->id,
        'name' => 'Deletable Template',
        'modules' => [],
        'created_by' => $this->admin->id,
    ]);

    expect($this->admin->can('delete', $template))->toBeTrue();
});

test('org_admin cannot delete other org site template', function () {
    $template = SiteTemplate::create([
        'org_id' => $this->otherOrg->id,
        'name' => 'Protected Template',
        'modules' => [],
        'created_by' => $this->otherAdmin->id,
    ]);

    expect($this->admin->can('delete', $template))->toBeFalse();
});

// ── DataExportPolicy ───────────────────────────────────────────

test('org_admin with permission can viewAny data exports', function () {
    expect($this->admin->can('viewAny', DataExport::class))->toBeTrue();
});

test('org_admin with permission can create data export', function () {
    expect($this->admin->can('create', DataExport::class))->toBeTrue();
});

test('site_viewer cannot viewAny data exports', function () {
    expect($this->viewer->can('viewAny', DataExport::class))->toBeFalse();
});

test('site_viewer cannot create data export', function () {
    expect($this->viewer->can('create', DataExport::class))->toBeFalse();
});

// ── MaintenanceWindowPolicy ────────────────────────────────────

test('site_manager with permission can viewAny maintenance windows', function () {
    $manager = createUserWithRole('client_site_manager', $this->org);
    $manager->sites()->attach($this->site->id, ['assigned_at' => now()]);

    expect($manager->can('viewAny', MaintenanceWindow::class))->toBeTrue();
});

test('site_viewer cannot viewAny maintenance windows', function () {
    expect($this->viewer->can('viewAny', MaintenanceWindow::class))->toBeFalse();
});

test('site_manager can view maintenance window for accessible site', function () {
    $manager = createUserWithRole('client_site_manager', $this->org);
    $manager->sites()->attach($this->site->id, ['assigned_at' => now()]);

    $window = MaintenanceWindow::create([
        'site_id' => $this->site->id,
        'title' => 'Cleaning',
        'recurrence' => 'daily',
        'start_time' => '10:00',
        'duration_minutes' => 60,
        'created_by' => $manager->id,
    ]);

    expect($manager->can('view', $window))->toBeTrue();
});

test('site_manager cannot view maintenance window for inaccessible site', function () {
    $otherSite = createSite($this->otherOrg, ['name' => 'Other Site']);
    $manager = createUserWithRole('client_site_manager', $this->org);
    $manager->sites()->attach($this->site->id, ['assigned_at' => now()]);

    $window = MaintenanceWindow::create([
        'site_id' => $otherSite->id,
        'title' => 'Secret Cleaning',
        'recurrence' => 'daily',
        'start_time' => '10:00',
        'duration_minutes' => 60,
        'created_by' => $this->otherAdmin->id,
    ]);

    expect($manager->can('view', $window))->toBeFalse();
});

test('org_admin can create maintenance windows', function () {
    expect($this->admin->can('create', MaintenanceWindow::class))->toBeTrue();
});

test('org_admin can update maintenance window for own org site', function () {
    $window = MaintenanceWindow::create([
        'site_id' => $this->site->id,
        'title' => 'Updatable Window',
        'recurrence' => 'weekly',
        'start_time' => '14:00',
        'duration_minutes' => 120,
        'created_by' => $this->admin->id,
    ]);

    expect($this->admin->can('update', $window))->toBeTrue();
});

test('org_admin cannot update maintenance window for other org site', function () {
    $otherSite = createSite($this->otherOrg, ['name' => 'Other Site']);

    $window = MaintenanceWindow::create([
        'site_id' => $otherSite->id,
        'title' => 'Cross-org Window',
        'recurrence' => 'daily',
        'start_time' => '10:00',
        'duration_minutes' => 60,
        'created_by' => $this->otherAdmin->id,
    ]);

    expect($this->admin->can('update', $window))->toBeFalse();
});

test('org_admin can delete maintenance window for own org site', function () {
    $window = MaintenanceWindow::create([
        'site_id' => $this->site->id,
        'title' => 'Deletable Window',
        'recurrence' => 'once',
        'start_time' => '08:00',
        'duration_minutes' => 30,
        'created_by' => $this->admin->id,
    ]);

    expect($this->admin->can('delete', $window))->toBeTrue();
});

test('super_admin can manage any maintenance window', function () {
    $otherSite = createSite($this->otherOrg, ['name' => 'Remote Site']);

    $window = MaintenanceWindow::create([
        'site_id' => $otherSite->id,
        'title' => 'Remote Window',
        'recurrence' => 'daily',
        'start_time' => '10:00',
        'duration_minutes' => 60,
        'created_by' => $this->otherAdmin->id,
    ]);

    expect($this->superAdmin->can('view', $window))->toBeTrue()
        ->and($this->superAdmin->can('update', $window))->toBeTrue()
        ->and($this->superAdmin->can('delete', $window))->toBeTrue();
});
