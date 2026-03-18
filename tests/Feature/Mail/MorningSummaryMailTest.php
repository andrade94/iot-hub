<?php

use App\Mail\MorningSummaryMail;

test('mailable renders with correct subject', function () {
    $mailable = new MorningSummaryMail('Warehouse Alpha', [
        'device_status' => ['online' => 8, 'offline' => 2, 'total' => 10, 'low_battery' => 1],
        'alert_count_24h' => 3,
    ]);

    $mailable->assertHasSubject('Morning Summary — Warehouse Alpha');
});

test('mailable contains site name', function () {
    $mailable = new MorningSummaryMail('Cold Storage Bravo', [
        'device_status' => ['online' => 5, 'offline' => 0, 'total' => 5, 'low_battery' => 0],
        'alert_count_24h' => 0,
    ]);

    $rendered = $mailable->render();

    expect($rendered)->toContain('Cold Storage Bravo');
});

test('mailable contains device status data', function () {
    $summary = [
        'device_status' => [
            'online' => 12,
            'offline' => 3,
            'total' => 15,
            'low_battery' => 2,
        ],
        'alert_count_24h' => 7,
    ];

    $mailable = new MorningSummaryMail('Distribution Center', $summary);

    $rendered = $mailable->render();

    // Verify device status data appears in the rendered output
    expect($rendered)->toContain('12')   // online count
        ->toContain('15')                // total count
        ->toContain('3')                 // offline count
        ->toContain('2')                 // low battery count
        ->toContain('7')                 // alert count 24h
        ->toContain('Distribution Center');
});
