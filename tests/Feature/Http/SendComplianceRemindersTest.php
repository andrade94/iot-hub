<?php

use App\Mail\ComplianceReminderMail;
use App\Models\ComplianceEvent;
use Illuminate\Support\Facades\Mail;

beforeEach(function () {
    seedPermissions();
    Mail::fake();

    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->admin = createUserWithRole('org_admin', $this->org);
});

test('sends email for event due in 30 days', function () {
    ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'title' => 'COFEPRIS Audit',
        'due_date' => now()->addDays(30)->toDateString(),
        'status' => 'upcoming',
        'reminders_sent' => [],
    ]);

    $this->artisan('compliance:send-reminders')
        ->assertSuccessful();

    Mail::assertQueued(ComplianceReminderMail::class, function ($mail) {
        return $mail->daysUntilDue === 30;
    });
});

test('sends email for event due in 7 days', function () {
    ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'title' => 'Calibration Check',
        'due_date' => now()->addDays(7)->toDateString(),
        'status' => 'upcoming',
        'reminders_sent' => [],
    ]);

    $this->artisan('compliance:send-reminders')
        ->assertSuccessful();

    Mail::assertQueued(ComplianceReminderMail::class, function ($mail) {
        return $mail->daysUntilDue === 7;
    });
});

test('sends email for event due in 1 day', function () {
    ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'title' => 'Urgent Inspection',
        'due_date' => now()->addDays(1)->toDateString(),
        'status' => 'upcoming',
        'reminders_sent' => [],
    ]);

    $this->artisan('compliance:send-reminders')
        ->assertSuccessful();

    Mail::assertQueued(ComplianceReminderMail::class, function ($mail) {
        return $mail->daysUntilDue === 1;
    });
});

test('does not send for events due in other day counts', function () {
    ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'title' => 'Event Due in 15 Days',
        'due_date' => now()->addDays(15)->toDateString(),
        'status' => 'upcoming',
        'reminders_sent' => [],
    ]);

    $this->artisan('compliance:send-reminders')
        ->assertSuccessful();

    Mail::assertNotQueued(ComplianceReminderMail::class);
});

test('does not re-send already sent reminders', function () {
    ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'title' => 'Already Reminded',
        'due_date' => now()->addDays(30)->toDateString(),
        'status' => 'upcoming',
        'reminders_sent' => [30], // 30-day reminder already sent
    ]);

    $this->artisan('compliance:send-reminders')
        ->assertSuccessful();

    Mail::assertNotQueued(ComplianceReminderMail::class);
});

test('dry run does not send emails', function () {
    ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'title' => 'Dry Run Event',
        'due_date' => now()->addDays(7)->toDateString(),
        'status' => 'upcoming',
        'reminders_sent' => [],
    ]);

    $this->artisan('compliance:send-reminders', ['--dry-run' => true])
        ->assertSuccessful();

    Mail::assertNotQueued(ComplianceReminderMail::class);
});

test('updates reminders_sent after sending', function () {
    $event = ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'title' => 'Track Reminders',
        'due_date' => now()->addDays(30)->toDateString(),
        'status' => 'upcoming',
        'reminders_sent' => [],
    ]);

    $this->artisan('compliance:send-reminders')
        ->assertSuccessful();

    $event->refresh();
    expect($event->reminders_sent)->toContain(30);
});

test('does not send for completed events', function () {
    ComplianceEvent::factory()->completed()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'title' => 'Completed Event',
        'due_date' => now()->addDays(7)->toDateString(),
    ]);

    $this->artisan('compliance:send-reminders')
        ->assertSuccessful();

    Mail::assertNotQueued(ComplianceReminderMail::class);
});

test('sends to all admin users for the organization', function () {
    $secondAdmin = createUserWithRole('org_admin', $this->org);

    ComplianceEvent::factory()->create([
        'org_id' => $this->org->id,
        'site_id' => $this->site->id,
        'title' => 'Multi-Admin Event',
        'due_date' => now()->addDays(7)->toDateString(),
        'status' => 'upcoming',
        'reminders_sent' => [],
    ]);

    $this->artisan('compliance:send-reminders')
        ->assertSuccessful();

    Mail::assertQueued(ComplianceReminderMail::class, 2);
});
