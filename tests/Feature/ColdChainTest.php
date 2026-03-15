<?php

use App\Models\DefrostSchedule;
use App\Models\Device;
use App\Models\Organization;
use App\Models\SensorReading;
use App\Models\Site;
use App\Services\Reports\TemperatureReport;
use App\Services\RulesEngine\DefrostDetector;
use Carbon\Carbon;

beforeEach(function () {
    $this->org = Organization::create([
        'name' => 'Cold Chain Test Org', 'slug' => 'cc-test-org', 'segment' => 'cold_chain',
    ]);

    $this->site = Site::create([
        'org_id' => $this->org->id,
        'name' => 'Cold Chain Test Site',
        'status' => 'active',
    ]);

    $this->device = Device::create([
        'site_id' => $this->site->id,
        'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFEC00001',
        'name' => 'Walk-in Cooler',
        'zone' => 'Cooler A',
        'status' => 'active',
    ]);
});

test('DefrostSchedule can be created', function () {
    $schedule = DefrostSchedule::create([
        'device_id' => $this->device->id,
        'site_id' => $this->site->id,
        'status' => 'detected',
        'windows' => [
            ['start_time' => '06:00', 'end_time' => '06:30', 'avg_peak' => 12.5, 'avg_duration' => 25],
            ['start_time' => '18:00', 'end_time' => '18:30', 'avg_peak' => 11.8, 'avg_duration' => 28],
        ],
        'detected_at' => now(),
    ]);

    expect($schedule->windows)->toHaveCount(2)
        ->and($schedule->status)->toBe('detected')
        ->and($schedule->device->id)->toBe($this->device->id);
});

test('DefrostDetector analyzeSpikes returns spike data', function () {
    // Create readings with a spike pattern
    $baseTemp = 4.0;
    for ($i = 0; $i < 96; $i++) { // 48 hours at 30-min intervals
        $time = now()->subHours(48)->addMinutes($i * 30);
        $temp = $baseTemp;

        // Create spikes at hours 6, 18, 30, 42 (simulating 2x daily defrost)
        $hour = $i * 0.5;
        if (in_array((int) $hour, [6, 18, 30, 42])) {
            $temp = $baseTemp + 8; // spike
        }

        SensorReading::create([
            'time' => $time,
            'device_id' => $this->device->id,
            'metric' => 'temperature',
            'value' => $temp,
            'unit' => '°C',
        ]);
    }

    $detector = app(DefrostDetector::class);
    $spikes = $detector->analyzeSpikes($this->device, 48);

    expect($spikes)->toBeArray();
});

test('DefrostDetector shouldSuppressAlert checks windows', function () {
    // Create a defrost schedule with a window at current time
    $now = now();
    DefrostSchedule::create([
        'device_id' => $this->device->id,
        'site_id' => $this->site->id,
        'status' => 'confirmed',
        'windows' => [
            [
                'start_time' => $now->copy()->subMinutes(5)->format('H:i'),
                'end_time' => $now->copy()->addMinutes(25)->format('H:i'),
                'avg_peak' => 12.0,
                'avg_duration' => 25,
            ],
        ],
        'detected_at' => now()->subDays(2),
    ]);

    $detector = app(DefrostDetector::class);
    $suppress = $detector->shouldSuppressAlert($this->device);

    expect($suppress)->toBeTrue();
});

test('TemperatureReport generates report data', function () {
    // Add temperature readings
    for ($i = 0; $i < 48; $i++) {
        SensorReading::create([
            'time' => now()->subHours($i),
            'device_id' => $this->device->id,
            'metric' => 'temperature',
            'value' => 4.0 + sin($i / 5) * 2,
            'unit' => '°C',
        ]);
    }

    $reportService = app(TemperatureReport::class);
    $report = $reportService->generateReport($this->site, now()->subDays(2), now());

    expect($report)->toHaveKey('site')
        ->toHaveKey('per_zone')
        ->toHaveKey('summary');

    expect($report['summary'])->toHaveKey('total_readings')
        ->toHaveKey('total_excursions')
        ->toHaveKey('compliance_pct');
});
