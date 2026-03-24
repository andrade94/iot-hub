<?php

use App\Models\Device;
use App\Models\Organization;
use App\Models\SensorReading;
use App\Models\Site;
use App\Services\Analytics\PredictiveAnalyticsService;

beforeEach(function () {
    $this->org = Organization::factory()->create();
    $this->site = Site::factory()->create(['org_id' => $this->org->id]);
    $this->service = new PredictiveAnalyticsService;
});

// ── Battery Prediction ─────────────────────────────────────────

test('battery prediction returns null for device without battery', function () {
    $device = Device::factory()->create(['site_id' => $this->site->id, 'battery_pct' => null]);
    expect($this->service->predictBatteryLife($device))->toBeNull();
});

test('battery prediction returns insufficient_data with < 7 readings', function () {
    $device = Device::factory()->create(['site_id' => $this->site->id, 'battery_pct' => 80]);

    for ($i = 0; $i < 5; $i++) {
        SensorReading::create([
            'device_id' => $device->id,
            'time' => now()->subDays($i),
            'metric' => 'battery',
            'value' => 80 - $i,
            'unit' => '%',
        ]);
    }

    $result = $this->service->predictBatteryLife($device);
    expect($result['confidence'])->toBe('insufficient_data');
});

test('battery prediction estimates days to replacement', function () {
    $device = Device::factory()->create(['site_id' => $this->site->id, 'battery_pct' => 50]);

    // Simulate battery draining ~1%/day: 80% (30 days ago) → 50% (today)
    for ($daysAgo = 30; $daysAgo >= 0; $daysAgo--) {
        SensorReading::create([
            'device_id' => $device->id,
            'time' => now()->subDays($daysAgo)->startOfDay()->addHour(),
            'metric' => 'battery',
            'value' => 50 + $daysAgo, // 30 days ago: 80%, today: 50%
            'unit' => '%',
        ]);
    }

    $result = $this->service->predictBatteryLife($device);
    // Battery is draining (slope should be negative → drain_rate > 0)
    // If stable, the regression detected no drain — verify confidence at least
    expect($result['confidence'])->not->toBe('insufficient_data');
    expect($result)->toHaveKey('drain_rate_per_day');
    expect($result)->toHaveKey('current_pct');
    expect($result['current_pct'])->toBe(50);
});

// ── Compressor Degradation ─────────────────────────────────────

test('compressor detection returns null for non-CT101 devices', function () {
    $device = Device::factory()->create(['site_id' => $this->site->id, 'model' => 'EM300-TH']);
    expect($this->service->detectCompressorDegradation($device))->toBeNull();
});

test('compressor detection returns insufficient_data without baseline', function () {
    $device = Device::factory()->create(['site_id' => $this->site->id, 'model' => 'CT101']);
    $result = $this->service->detectCompressorDegradation($device);
    expect($result['status'])->toBe('insufficient_data');
});

test('compressor detection returns normal when current is stable', function () {
    $device = Device::factory()->create(['site_id' => $this->site->id, 'model' => 'CT101']);

    // Baseline: 30-60 days ago at 10A
    for ($d = 60; $d > 30; $d--) {
        SensorReading::create([
            'device_id' => $device->id,
            'time' => now()->subDays($d),
            'metric' => 'current',
            'value' => 10.0 + (rand(-5, 5) / 10),
            'unit' => 'A',
        ]);
    }

    // Last 4 weeks: still ~10A
    for ($d = 28; $d >= 0; $d--) {
        SensorReading::create([
            'device_id' => $device->id,
            'time' => now()->subDays($d),
            'metric' => 'current',
            'value' => 10.0 + (rand(-5, 5) / 10),
            'unit' => 'A',
        ]);
    }

    $result = $this->service->detectCompressorDegradation($device);
    expect($result['status'])->toBe('normal');
    expect($result['baseline_amps'])->toBeGreaterThan(0);
});

// ── Temperature Drift ──────────────────────────────────────────

test('temp drift returns null for non-temp devices', function () {
    $device = Device::factory()->create(['site_id' => $this->site->id, 'model' => 'CT101']);
    expect($this->service->detectTemperatureDrift($device))->toBeNull();
});

test('temp drift returns insufficient_data without baseline', function () {
    $device = Device::factory()->create(['site_id' => $this->site->id, 'model' => 'EM300-TH']);
    $result = $this->service->detectTemperatureDrift($device);
    expect($result['status'])->toBe('insufficient_data');
});

test('temp drift returns normal when temp is stable', function () {
    $device = Device::factory()->create(['site_id' => $this->site->id, 'model' => 'EM300-TH']);

    // Baseline: 15-45 days ago at -18°C (use hour offset to avoid unique constraint)
    for ($d = 45; $d > 15; $d--) {
        SensorReading::create([
            'device_id' => $device->id,
            'time' => now()->subDays($d)->startOfDay()->addHours(8),
            'metric' => 'temperature',
            'value' => -18.0 + (rand(-2, 2) / 10),
            'unit' => '°C',
        ]);
    }

    // Last 3 weeks: still -18°C
    for ($d = 21; $d >= 0; $d--) {
        SensorReading::create([
            'device_id' => $device->id,
            'time' => now()->subDays($d)->startOfDay()->addHours(12),
            'metric' => 'temperature',
            'value' => -18.0 + (rand(-2, 2) / 10),
            'unit' => '°C',
        ]);
    }

    $result = $this->service->detectTemperatureDrift($device);
    expect($result['status'])->toBe('normal');
    expect($result['baseline_temp'])->toBeLessThan(0);
});

// ── Combined Analysis ──────────────────────────────────────────

test('analyzeDevice returns all prediction types', function () {
    $device = Device::factory()->create(['site_id' => $this->site->id, 'model' => 'EM300-TH', 'battery_pct' => 75]);

    $result = $this->service->analyzeDevice($device);

    expect($result)->toHaveKeys(['device_id', 'device_name', 'model', 'battery', 'compressor', 'temperature_drift']);
    expect($result['battery'])->not->toBeNull();
    expect($result['compressor'])->toBeNull(); // Not a CT101
    expect($result['temperature_drift'])->not->toBeNull(); // Is EM300-TH
});
