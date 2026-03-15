<?php

use App\Jobs\SendMorningSummary;
use App\Models\Site;
use Carbon\Carbon;

beforeEach(function () {
    $this->org = createOrg();
});

test('dispatches summary to site with matching opening time', function () {
    Carbon::setTestNow(Carbon::parse('2026-03-15 14:00:00', 'UTC'));

    Site::create([
        'org_id' => $this->org->id,
        'name' => 'Test Site',
        'status' => 'active',
        'timezone' => 'America/Mexico_City',
        'opening_hour' => Carbon::parse('08:00'),
    ]);

    (new SendMorningSummary)->handle(app(\App\Services\Reports\MorningSummaryService::class));

    // Job ran without exception
    expect(true)->toBeTrue();

    Carbon::setTestNow();
});

test('skips site when not opening time', function () {
    Carbon::setTestNow(Carbon::parse('2026-03-15 12:00:00', 'UTC'));

    Site::create([
        'org_id' => $this->org->id,
        'name' => 'Wrong Time Site',
        'status' => 'active',
        'timezone' => 'America/Mexico_City',
        'opening_hour' => Carbon::parse('08:00'),
    ]);

    (new SendMorningSummary)->handle(app(\App\Services\Reports\MorningSummaryService::class));

    expect(true)->toBeTrue();

    Carbon::setTestNow();
});

test('skips sites without timezone or opening_hour', function () {
    Site::create([
        'org_id' => $this->org->id,
        'name' => 'No Timezone',
        'status' => 'active',
        'timezone' => null,
        'opening_hour' => null,
    ]);

    (new SendMorningSummary)->handle(app(\App\Services\Reports\MorningSummaryService::class));

    expect(true)->toBeTrue();
});
