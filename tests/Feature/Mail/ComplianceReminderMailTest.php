<?php

use App\Mail\ComplianceReminderMail;
use App\Models\ComplianceEvent;

beforeEach(function () {
    $this->org = createOrg();
    $this->site = createSite($this->org);
});

test('renders with correct subject for multiple days', function () {
    $event = ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'title' => 'COFEPRIS Audit',
        'due_date' => now()->addDays(30),
    ]);

    $mail = new ComplianceReminderMail($event, 30);

    expect($mail->envelope()->subject)->toBe('Reminder: COFEPRIS Audit due in 30 days');
});

test('renders with correct subject for 1 day (singular)', function () {
    $event = ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'title' => 'Calibration Check',
        'due_date' => now()->addDay(),
    ]);

    $mail = new ComplianceReminderMail($event, 1);

    expect($mail->envelope()->subject)->toBe('Reminder: Calibration Check due in 1 day');
});

test('email body contains event title', function () {
    $event = ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'title' => 'Annual Inspection',
        'due_date' => now()->addDays(7),
    ]);

    $mail = new ComplianceReminderMail($event, 7);

    $rendered = $mail->render();
    expect($rendered)->toContain('Annual Inspection');
});

test('email body contains days until due', function () {
    $event = ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'title' => 'Permit Renewal',
        'due_date' => now()->addDays(7),
    ]);

    $mail = new ComplianceReminderMail($event, 7);

    $rendered = $mail->render();
    expect($rendered)->toContain('7 day');
});

test('email body contains site name', function () {
    $event = ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'title' => 'Certificate Renewal',
        'due_date' => now()->addDays(30),
    ]);

    $mail = new ComplianceReminderMail($event, 30);

    $rendered = $mail->render();
    expect($rendered)->toContain($this->site->name);
});

test('email body contains compliance calendar link', function () {
    $event = ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'title' => 'Inspection',
        'due_date' => now()->addDays(7),
    ]);

    $mail = new ComplianceReminderMail($event, 7);

    $rendered = $mail->render();
    expect($rendered)->toContain('/settings/compliance');
});

test('view data includes expected keys', function () {
    $event = ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'title' => 'Test Event',
        'due_date' => now()->addDays(7),
    ]);

    $mail = new ComplianceReminderMail($event, 7);

    $content = $mail->content();
    expect($content->with)->toHaveKey('event');
    expect($content->with)->toHaveKey('daysUntilDue');
    expect($content->with)->toHaveKey('siteName');
    expect($content->with)->toHaveKey('calendarUrl');
    expect($content->with['daysUntilDue'])->toBe(7);
});

test('uses correct view template', function () {
    $event = ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'title' => 'Test Event',
        'due_date' => now()->addDays(7),
    ]);

    $mail = new ComplianceReminderMail($event, 7);

    $content = $mail->content();
    expect($content->view)->toBe('emails.compliance-reminder');
});

test('email renders event description when present', function () {
    $event = ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'title' => 'Described Event',
        'description' => 'All sensors must be recalibrated before deadline.',
        'due_date' => now()->addDays(7),
    ]);

    $mail = new ComplianceReminderMail($event, 7);

    $rendered = $mail->render();
    expect($rendered)->toContain('All sensors must be recalibrated before deadline.');
});
