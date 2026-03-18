<?php

use App\Models\Invoice;
use App\Models\SensorReading;
use App\Services\Integrations\SapExportService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->service = new SapExportService;
});

// ──────────────────────────────────────────────────────────────────────
// CSV Export (existing tests)
// ──────────────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────────────
// Invoice Export (POST to SAP endpoint)
// ──────────────────────────────────────────────────────────────────────

test('exports invoices to SAP endpoint successfully', function () {
    config([
        'services.sap.endpoint' => 'https://sap-test.example.com',
        'services.sap.api_key' => 'test-api-key',
        'services.sap.company_code' => 'ASTREA-001',
    ]);

    Http::fake([
        'https://sap-test.example.com/invoices' => Http::response(['status' => 'ok'], 200),
    ]);

    Invoice::factory()->create([
        'org_id' => $this->org->id,
        'period' => '2026-03',
        'status' => 'paid',
        'subtotal' => 10000.00,
        'iva' => 1600.00,
        'total' => 11600.00,
    ]);

    $result = $this->service->exportInvoices($this->org, '2026-03');

    expect($result['success'])->toBeTrue();
    expect($result['exported_count'])->toBe(1);
    expect($result['message'])->toContain('Exported 1 invoice(s) to SAP');

    Http::assertSent(function ($request) {
        return $request->url() === 'https://sap-test.example.com/invoices'
            && $request->hasHeader('X-API-Key', 'test-api-key')
            && $request->hasHeader('X-Company-Code', 'ASTREA-001');
    });
});

test('handles missing SAP config gracefully', function () {
    config([
        'services.sap.endpoint' => null,
        'services.sap.api_key' => null,
    ]);

    $result = $this->service->exportInvoices($this->org, '2026-03');

    expect($result['success'])->toBeFalse();
    expect($result['message'])->toContain('not configured');
    expect($result['exported_count'])->toBe(0);
});

test('handles empty invoices for period', function () {
    config([
        'services.sap.endpoint' => 'https://sap-test.example.com',
        'services.sap.api_key' => 'test-api-key',
        'services.sap.company_code' => 'ASTREA-001',
    ]);

    $result = $this->service->exportInvoices($this->org, '2099-12');

    expect($result['success'])->toBeTrue();
    expect($result['message'])->toContain('No invoices found');
    expect($result['exported_count'])->toBe(0);
});

test('stores audit file when exporting invoices', function () {
    config([
        'services.sap.endpoint' => 'https://sap-test.example.com',
        'services.sap.api_key' => 'test-api-key',
        'services.sap.company_code' => 'ASTREA-001',
    ]);

    Http::fake([
        'https://sap-test.example.com/invoices' => Http::response(['status' => 'ok'], 200),
    ]);

    Invoice::factory()->create([
        'org_id' => $this->org->id,
        'period' => '2026-03',
    ]);

    $this->service->exportInvoices($this->org, '2026-03');

    // Verify audit file was created under exports/sap/
    $files = Storage::disk('local')->files('exports/sap');
    $matchingFiles = array_filter($files, fn ($f) => str_contains($f, 'invoices_2026-03'));
    expect($matchingFiles)->not->toBeEmpty();
});

test('returns failure when SAP API returns error status', function () {
    config([
        'services.sap.endpoint' => 'https://sap-test.example.com',
        'services.sap.api_key' => 'test-api-key',
        'services.sap.company_code' => 'ASTREA-001',
    ]);

    Http::fake([
        'https://sap-test.example.com/invoices' => Http::response(['error' => 'Bad Request'], 400),
    ]);

    Invoice::factory()->create([
        'org_id' => $this->org->id,
        'period' => '2026-03',
    ]);

    $result = $this->service->exportInvoices($this->org, '2026-03');

    expect($result['success'])->toBeFalse();
    expect($result['message'])->toContain('400');
    expect($result['exported_count'])->toBe(0);
});

test('updates integration config on successful export', function () {
    config([
        'services.sap.endpoint' => 'https://sap-test.example.com',
        'services.sap.api_key' => 'test-api-key',
        'services.sap.company_code' => 'ASTREA-001',
    ]);

    Http::fake([
        'https://sap-test.example.com/invoices' => Http::response(['status' => 'ok'], 200),
    ]);

    Invoice::factory()->create([
        'org_id' => $this->org->id,
        'period' => '2026-03',
    ]);

    $this->service->exportInvoices($this->org, '2026-03');

    $this->assertDatabaseHas('integration_configs', [
        'org_id' => $this->org->id,
        'type' => 'sap',
    ]);
});
