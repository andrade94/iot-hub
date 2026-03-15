<?php

use App\Models\Device;
use App\Models\Organization;
use App\Models\SensorReading;
use App\Models\Site;
use App\Services\Readings\ReadingQueryService;
use Carbon\Carbon;

beforeEach(function () {
    $this->org = Organization::create([
        'name' => 'Test Org', 'slug' => 'test-org-query', 'segment' => 'cold_chain',
    ]);

    $this->site = Site::create([
        'org_id' => $this->org->id,
        'name' => 'Test Site',
        'status' => 'active',
    ]);

    $this->device = Device::create([
        'site_id' => $this->site->id,
        'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFE200001',
        'name' => 'Query Test Sensor',
        'status' => 'active',
    ]);

    $this->service = app(ReadingQueryService::class);

    // Seed 24 hours of readings (every 30 min = 48 readings)
    $baseTime = Carbon::now()->subHours(24);
    for ($i = 0; $i < 48; $i++) {
        SensorReading::create([
            'time' => $baseTime->copy()->addMinutes($i * 30),
            'device_id' => $this->device->id,
            'metric' => 'temperature',
            'value' => 4.0 + sin($i / 5) * 2,
            'unit' => '°C',
        ]);
    }
});

test('raw readings are returned without resolution', function () {
    $readings = $this->service->getReadings(
        $this->device->id,
        'temperature',
        Carbon::now()->subHours(24),
        Carbon::now(),
    );

    expect($readings)->toHaveCount(48);
});

test('aggregated readings are returned with resolution', function () {
    $readings = $this->service->getReadings(
        $this->device->id,
        'temperature',
        Carbon::now()->subHours(24),
        Carbon::now(),
        '1h',
    );

    // 24 hours of data with 1h buckets ≈ 24 buckets (some may combine)
    expect($readings->count())->toBeGreaterThan(0)
        ->and($readings->count())->toBeLessThanOrEqual(25);

    // Each aggregated reading should have avg/min/max
    $first = $readings->first();
    expect($first)->toHaveProperty('avg_value')
        ->toHaveProperty('min_value')
        ->toHaveProperty('max_value')
        ->toHaveProperty('reading_count');
});

test('time range filtering works correctly', function () {
    $readings = $this->service->getReadings(
        $this->device->id,
        'temperature',
        Carbon::now()->subHours(6),
        Carbon::now(),
    );

    // 6 hours at 30-min intervals = ~12 readings
    expect($readings->count())->toBeLessThanOrEqual(13)
        ->and($readings->count())->toBeGreaterThan(0);
});

test('getLatestReadings returns one per metric', function () {
    // Add humidity readings
    SensorReading::create([
        'time' => now()->subMinutes(5),
        'device_id' => $this->device->id,
        'metric' => 'humidity',
        'value' => 55.0,
        'unit' => '%',
    ]);

    $latest = $this->service->getLatestReadings($this->device->id);

    expect($latest)->toHaveCount(2); // temperature + humidity
});

test('getSummary returns statistics', function () {
    $summary = $this->service->getSummary(
        $this->device->id,
        'temperature',
        Carbon::now()->subHours(24),
        Carbon::now(),
    );

    expect($summary)->not->toBeNull()
        ->and($summary->reading_count)->toBe(48)
        ->and((float) $summary->avg_value)->toBeGreaterThan(0)
        ->and((float) $summary->min_value)->toBeLessThanOrEqual((float) $summary->avg_value)
        ->and((float) $summary->max_value)->toBeGreaterThanOrEqual((float) $summary->avg_value);
});
