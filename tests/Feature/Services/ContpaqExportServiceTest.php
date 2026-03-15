<?php

use App\Models\SensorReading;
use App\Services\Integrations\ContpaqExportService;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->service = new ContpaqExportService;
});

test('exports energy data in CONTPAQ format', function () {
    $device = createDevice($this->site);
    SensorReading::create([
        'time' => now()->subHour(),
        'device_id' => $device->id,
        'metric' => 'current',
        'value' => 5.0,
        'unit' => 'A',
    ]);

    $path = $this->service->exportInvoices($this->org, now()->subDay(), now());

    expect($path)->toContain('exports/contpaq/');
    Storage::disk('local')->assertExists($path);

    $content = Storage::disk('local')->get($path);
    expect($content)->toContain('NumDocumento');
    expect($content)->toContain('kWh');
});

test('exports empty CSV for org with no sites', function () {
    $emptyOrg = createOrg(['name' => 'Empty']);

    $path = $this->service->exportInvoices($emptyOrg, now()->subDay(), now());

    Storage::disk('local')->assertExists($path);
});

test('CSV includes CONTPAQ headers', function () {
    $path = $this->service->exportInvoices($this->org, now()->subDay(), now());

    $content = Storage::disk('local')->get($path);
    $firstLine = explode("\n", $content)[0];
    expect($firstLine)->toBe('NumDocumento,Fecha,Concepto,Sitio,Cantidad,Unidad,PrecioUnitario,Importe');
});

test('calculates cost with CFE tariff rate', function () {
    $device = createDevice($this->site);
    SensorReading::create([
        'time' => now()->subHour(),
        'device_id' => $device->id,
        'metric' => 'current',
        'value' => 10.0, // 10 kWh
        'unit' => 'A',
    ]);

    $path = $this->service->exportInvoices($this->org, now()->subDay(), now());

    $content = Storage::disk('local')->get($path);
    // Rate is 2.50 MXN/kWh, 10 * 2.50 = 25.00
    expect($content)->toContain('2.5');
});
