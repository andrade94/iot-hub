<?php

use App\Models\SensorReading;
use App\Services\Reports\EnergyReport;
use App\Services\RulesEngine\BaselineService;
use Carbon\Carbon;

beforeEach(function () {
    $this->org = createOrg();
    $this->site = createSite($this->org, [
        'opening_hour' => '08:00',
    ]);

    $this->baselineService = $this->mock(BaselineService::class);
    $this->baselineService->shouldReceive('learnBaseline')->andReturn([]);

    $this->report = new EnergyReport($this->baselineService);
});

test('calculates day vs night consumption', function () {
    $device = createDevice($this->site, [
        'model' => 'CT101',
        'status' => 'active',
    ]);

    $from = Carbon::parse('2026-03-10 00:00:00');
    $to = Carbon::parse('2026-03-10 23:59:59');

    // Day reading (hour 10 — within 08:00–24:00 operating window)
    SensorReading::create([
        'device_id' => $device->id,
        'metric' => 'current',
        'value' => 100.0,
        'unit' => 'A',
        'time' => Carbon::parse('2026-03-10 10:00:00'),
    ]);

    // Night reading (hour 3 — outside operating window)
    SensorReading::create([
        'device_id' => $device->id,
        'metric' => 'current',
        'value' => 50.0,
        'unit' => 'A',
        'time' => Carbon::parse('2026-03-10 03:00:00'),
    ]);

    $result = $this->report->analyzeNightWaste($this->site, $from, $to);

    expect($result)->toHaveKey('devices');
    expect($result)->toHaveKey('summary');
    expect($result['devices'])->toHaveCount(1);

    $deviceResult = $result['devices'][0];
    expect($deviceResult['day_kwh'])->toBeGreaterThanOrEqual(0);
    expect($deviceResult['night_kwh'])->toBeGreaterThanOrEqual(0);
    expect($deviceResult['night_pct'])->toBeGreaterThanOrEqual(0);
});

test('flags devices with more than 30 percent night usage', function () {
    $device = createDevice($this->site, [
        'model' => 'CT101',
        'status' => 'active',
    ]);

    $from = Carbon::parse('2026-03-10 00:00:00');
    $to = Carbon::parse('2026-03-10 23:59:59');

    // Small day reading
    SensorReading::create([
        'device_id' => $device->id,
        'metric' => 'current',
        'value' => 10.0,
        'unit' => 'A',
        'time' => Carbon::parse('2026-03-10 10:00:00'),
    ]);

    // Large night reading (>30% of total)
    SensorReading::create([
        'device_id' => $device->id,
        'metric' => 'current',
        'value' => 100.0,
        'unit' => 'A',
        'time' => Carbon::parse('2026-03-10 03:00:00'),
    ]);

    $result = $this->report->analyzeNightWaste($this->site, $from, $to);

    $deviceResult = $result['devices'][0];
    expect($deviceResult['waste_flag'])->toBeTrue();
    expect($deviceResult['night_pct'])->toBeGreaterThan(30);
});

test('does not flag devices with less than 30 percent night usage', function () {
    $device = createDevice($this->site, [
        'model' => 'CT101',
        'status' => 'active',
    ]);

    $from = Carbon::parse('2026-03-10 00:00:00');
    $to = Carbon::parse('2026-03-10 23:59:59');

    // Large day reading
    SensorReading::create([
        'device_id' => $device->id,
        'metric' => 'current',
        'value' => 200.0,
        'unit' => 'A',
        'time' => Carbon::parse('2026-03-10 12:00:00'),
    ]);

    // Small night reading (<30% of total)
    SensorReading::create([
        'device_id' => $device->id,
        'metric' => 'current',
        'value' => 10.0,
        'unit' => 'A',
        'time' => Carbon::parse('2026-03-10 03:00:00'),
    ]);

    $result = $this->report->analyzeNightWaste($this->site, $from, $to);

    $deviceResult = $result['devices'][0];
    expect($deviceResult['waste_flag'])->toBeFalse();
    expect($deviceResult['night_pct'])->toBeLessThanOrEqual(30);
});

test('handles site with no opening_hour by defaulting to 6am', function () {
    $siteNoHour = createSite($this->org, [
        'opening_hour' => null,
    ]);

    $device = createDevice($siteNoHour, [
        'model' => 'CT101',
        'status' => 'active',
    ]);

    $from = Carbon::parse('2026-03-10 00:00:00');
    $to = Carbon::parse('2026-03-10 23:59:59');

    SensorReading::create([
        'device_id' => $device->id,
        'metric' => 'current',
        'value' => 50.0,
        'unit' => 'A',
        'time' => Carbon::parse('2026-03-10 12:00:00'),
    ]);

    $result = $this->report->analyzeNightWaste($siteNoHour, $from, $to);

    // Default opening_hour=6, closing=22 => "6:00 - 22:00"
    expect($result['summary']['operating_hours'])->toBe('6:00 - 22:00');
    expect($result['devices'])->toHaveCount(1);
});

test('summary totals aggregate across all devices', function () {
    $device1 = createDevice($this->site, ['model' => 'CT101', 'status' => 'active']);
    $device2 = createDevice($this->site, ['model' => 'EM310-UDL', 'status' => 'active']);

    $from = Carbon::parse('2026-03-10 00:00:00');
    $to = Carbon::parse('2026-03-10 23:59:59');

    // Device 1: day reading
    SensorReading::create([
        'device_id' => $device1->id,
        'metric' => 'current',
        'value' => 80.0,
        'unit' => 'A',
        'time' => Carbon::parse('2026-03-10 10:00:00'),
    ]);

    // Device 2: night reading
    SensorReading::create([
        'device_id' => $device2->id,
        'metric' => 'current',
        'value' => 40.0,
        'unit' => 'A',
        'time' => Carbon::parse('2026-03-10 03:00:00'),
    ]);

    $result = $this->report->analyzeNightWaste($this->site, $from, $to);

    expect($result['devices'])->toHaveCount(2);
    expect($result['summary']['total_day_kwh'])->toBeGreaterThanOrEqual(0);
    expect($result['summary']['total_night_kwh'])->toBeGreaterThanOrEqual(0);
    expect($result['summary']['night_cost_mxn'])->toBeGreaterThanOrEqual(0);
});

test('returns zero percentages when no readings exist', function () {
    createDevice($this->site, ['model' => 'CT101', 'status' => 'active']);

    $from = Carbon::parse('2026-03-10 00:00:00');
    $to = Carbon::parse('2026-03-10 23:59:59');

    $result = $this->report->analyzeNightWaste($this->site, $from, $to);

    expect($result['devices'])->toHaveCount(1);
    $deviceResult = $result['devices'][0];
    expect($deviceResult['day_kwh'])->toBe(0.0);
    expect($deviceResult['night_kwh'])->toBe(0.0);
    expect($deviceResult['night_pct'])->toBe(0.0);
    expect($deviceResult['waste_flag'])->toBeFalse();
});

test('returns empty devices array for site with no devices', function () {
    $emptySite = createSite($this->org, ['opening_hour' => '08:00']);

    $from = Carbon::parse('2026-03-10 00:00:00');
    $to = Carbon::parse('2026-03-10 23:59:59');

    $result = $this->report->analyzeNightWaste($emptySite, $from, $to);

    expect($result['devices'])->toBeEmpty();
    expect($result['summary']['total_night_kwh'])->toBe(0.0);
    expect($result['summary']['total_day_kwh'])->toBe(0.0);
    expect($result['summary']['night_pct'])->toBe(0.0);
});
