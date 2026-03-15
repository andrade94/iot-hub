<?php

use App\Models\SensorReading;
use App\Services\Integrations\SapExportService;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->service = new SapExportService;
});

test('exports readings to CSV', function () {
    $device = createDevice($this->site);
    SensorReading::create([
        'time' => now()->subHour(),
        'device_id' => $device->id,
        'metric' => 'temperature',
        'value' => 4.5,
        'unit' => '°C',
    ]);

    $path = $this->service->exportReadings($this->org, now()->subDay(), now());

    expect($path)->toContain('exports/sap/');
    Storage::disk('local')->assertExists($path);

    $content = Storage::disk('local')->get($path);
    expect($content)->toContain('Site,Device,DevEUI');
    expect($content)->toContain('temperature');
});

test('exports empty CSV for org with no sites', function () {
    $emptyOrg = createOrg(['name' => 'Empty']);

    $path = $this->service->exportReadings($emptyOrg, now()->subDay(), now());

    Storage::disk('local')->assertExists($path);
    $content = Storage::disk('local')->get($path);
    expect($content)->toContain('Site,Device,DevEUI');
});

test('CSV includes correct headers', function () {
    $path = $this->service->exportReadings($this->org, now()->subDay(), now());

    $content = Storage::disk('local')->get($path);
    $firstLine = explode("\n", $content)[0];
    expect($firstLine)->toBe('Site,Device,DevEUI,Zone,Metric,Value,Timestamp');
});

test('handles special characters in device names', function () {
    $device = createDevice($this->site, ['name' => 'Sensor, "Zone A"']);
    SensorReading::create([
        'time' => now()->subHour(),
        'device_id' => $device->id,
        'metric' => 'temperature',
        'value' => 4.5,
        'unit' => '°C',
    ]);

    $path = $this->service->exportReadings($this->org, now()->subDay(), now());

    $content = Storage::disk('local')->get($path);
    expect($content)->toContain('"Sensor, ""Zone A"""');
});
