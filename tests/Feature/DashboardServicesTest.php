<?php

use App\Models\Alert;
use App\Models\Device;
use App\Models\Organization;
use App\Models\SensorReading;
use App\Models\Site;
use App\Services\Readings\ChartDataService;
use App\Services\Reports\MorningSummaryService;
use Carbon\Carbon;

beforeEach(function () {
    $this->org = Organization::create([
        'name' => 'Dashboard Test Org', 'slug' => 'dash-test-org', 'segment' => 'cold_chain',
    ]);

    $this->site = Site::create([
        'org_id' => $this->org->id,
        'name' => 'Dashboard Test Site',
        'status' => 'active',
        'timezone' => 'America/Mexico_City',
    ]);

    $this->device = Device::create([
        'site_id' => $this->site->id,
        'model' => 'EM300-TH',
        'dev_eui' => 'A81758FFFED00001',
        'name' => 'Cooler Sensor',
        'zone' => 'Cooler A',
        'status' => 'active',
        'battery_pct' => 85,
        'last_reading_at' => now()->subMinutes(5),
    ]);

    // Add some readings
    for ($i = 0; $i < 24; $i++) {
        SensorReading::create([
            'time' => now()->subHours($i),
            'device_id' => $this->device->id,
            'metric' => 'temperature',
            'value' => 4.0 + sin($i / 3) * 1.5,
            'unit' => '°C',
        ]);
    }
});

test('ChartDataService returns site KPIs', function () {
    $service = app(ChartDataService::class);
    $kpis = $service->getSiteKPIs($this->site->id);

    expect($kpis)->toHaveKey('total_devices')
        ->toHaveKey('online_count')
        ->toHaveKey('offline_count')
        ->toHaveKey('active_alerts')
        ->toHaveKey('low_battery_count');

    expect($kpis['total_devices'])->toBe(1);
    expect($kpis['online_count'])->toBe(1);
});

test('ChartDataService returns time series data', function () {
    $service = app(ChartDataService::class);
    $data = $service->getTimeSeriesData($this->device->id, 'temperature', '24h');

    expect($data)->not->toBeEmpty();
});

test('ChartDataService returns zone summary', function () {
    $service = app(ChartDataService::class);
    $summary = $service->getZoneSummary($this->site->id, 'Cooler A');

    expect($summary)->toBeArray();
});

test('MorningSummaryService generates store summary', function () {
    $service = app(MorningSummaryService::class);
    $summary = $service->generateStoreSummary($this->site);

    expect($summary)->toHaveKey('site_name')
        ->toHaveKey('device_status')
        ->toHaveKey('temperature_by_zone')
        ->toHaveKey('alert_count_24h')
        ->toHaveKey('active_alerts');

    expect($summary['device_status']['total'])->toBe(1);
    expect($summary['device_status']['online'])->toBe(1);
});

test('MorningSummaryService generates corporate summary', function () {
    $service = app(MorningSummaryService::class);
    $summary = $service->generateCorporateSummary($this->org);

    expect($summary)->toBeArray();
});
