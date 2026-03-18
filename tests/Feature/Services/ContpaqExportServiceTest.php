<?php

use App\Models\Invoice;
use App\Models\SensorReading;
use App\Models\Subscription;
use App\Models\SubscriptionItem;
use App\Services\Integrations\ContpaqExportService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->service = new ContpaqExportService;
});

// ──────────────────────────────────────────────────────────────────────
// CSV Export (existing tests)
// ──────────────────────────────────────────────────────────────────────

test('exports energy data in CONTPAQ CSV format', function () {
    $device = createDevice($this->site);
    SensorReading::create([
        'time' => now()->subHour(),
        'device_id' => $device->id,
        'metric' => 'current',
        'value' => 5.0,
        'unit' => 'A',
    ]);

    $path = $this->service->exportReadingsCsv($this->org, now()->subDay(), now());

    expect($path)->toContain('exports/contpaq/');
    Storage::disk('local')->assertExists($path);

    $content = Storage::disk('local')->get($path);
    expect($content)->toContain('NumDocumento');
    expect($content)->toContain('kWh');
});

test('exports empty CSV for org with no sites', function () {
    $emptyOrg = createOrg(['name' => 'Empty']);

    $path = $this->service->exportReadingsCsv($emptyOrg, now()->subDay(), now());

    Storage::disk('local')->assertExists($path);
});

test('CSV includes CONTPAQ headers', function () {
    $path = $this->service->exportReadingsCsv($this->org, now()->subDay(), now());

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
        'value' => 10.0,
        'unit' => 'A',
    ]);

    $path = $this->service->exportReadingsCsv($this->org, now()->subDay(), now());

    $content = Storage::disk('local')->get($path);
    expect($content)->toContain('2.5');
});

// ──────────────────────────────────────────────────────────────────────
// Invoice Export (POST to CONTPAQ endpoint)
// ──────────────────────────────────────────────────────────────────────

test('exports invoices to CONTPAQ endpoint successfully', function () {
    config([
        'services.contpaq.endpoint' => 'https://contpaq-test.example.com',
        'services.contpaq.api_key' => 'contpaq-test-key',
    ]);

    Http::fake([
        'https://contpaq-test.example.com/documentos/importar' => Http::response(['status' => 'ok'], 200),
    ]);

    Invoice::factory()->create([
        'org_id' => $this->org->id,
        'period' => '2026-03',
        'status' => 'paid',
        'subtotal' => 8000.00,
        'iva' => 1280.00,
        'total' => 9280.00,
        'payment_method' => 'spei',
    ]);

    $result = $this->service->exportInvoices($this->org, '2026-03');

    expect($result['success'])->toBeTrue();
    expect($result['exported_count'])->toBe(1);
    expect($result['message'])->toContain('Exported 1 invoice(s) to CONTPAQ');

    Http::assertSent(function ($request) {
        return $request->url() === 'https://contpaq-test.example.com/documentos/importar'
            && $request->hasHeader('X-API-Key', 'contpaq-test-key');
    });
});

test('CONTPAQ payload uses Mexican ERP format', function () {
    config([
        'services.contpaq.endpoint' => 'https://contpaq-test.example.com',
        'services.contpaq.api_key' => 'contpaq-test-key',
    ]);

    Http::fake([
        'https://contpaq-test.example.com/documentos/importar' => Http::response(['status' => 'ok'], 200),
    ]);

    Invoice::factory()->create([
        'org_id' => $this->org->id,
        'period' => '2026-03',
        'status' => 'paid',
    ]);

    $this->service->exportInvoices($this->org, '2026-03');

    Http::assertSent(function ($request) {
        $body = $request->data();

        return isset($body['empresa'])
            && isset($body['periodo'])
            && isset($body['documentos']);
    });
});

test('handles missing CONTPAQ config gracefully', function () {
    config([
        'services.contpaq.endpoint' => null,
        'services.contpaq.api_key' => null,
    ]);

    $result = $this->service->exportInvoices($this->org, '2026-03');

    expect($result['success'])->toBeFalse();
    expect($result['message'])->toContain('not configured');
    expect($result['exported_count'])->toBe(0);
});

test('handles empty invoices for period in CONTPAQ export', function () {
    config([
        'services.contpaq.endpoint' => 'https://contpaq-test.example.com',
        'services.contpaq.api_key' => 'contpaq-test-key',
    ]);

    $result = $this->service->exportInvoices($this->org, '2099-12');

    expect($result['success'])->toBeTrue();
    expect($result['message'])->toContain('No invoices found');
    expect($result['exported_count'])->toBe(0);
});

test('stores audit file when exporting invoices to CONTPAQ', function () {
    config([
        'services.contpaq.endpoint' => 'https://contpaq-test.example.com',
        'services.contpaq.api_key' => 'contpaq-test-key',
    ]);

    Http::fake([
        'https://contpaq-test.example.com/documentos/importar' => Http::response(['status' => 'ok'], 200),
    ]);

    Invoice::factory()->create([
        'org_id' => $this->org->id,
        'period' => '2026-03',
    ]);

    $this->service->exportInvoices($this->org, '2026-03');

    $files = Storage::disk('local')->files('exports/contpaq');
    $matchingFiles = array_filter($files, fn ($f) => str_contains($f, 'invoices_2026-03'));
    expect($matchingFiles)->not->toBeEmpty();
});

test('returns failure when CONTPAQ API returns error status', function () {
    config([
        'services.contpaq.endpoint' => 'https://contpaq-test.example.com',
        'services.contpaq.api_key' => 'contpaq-test-key',
    ]);

    Http::fake([
        'https://contpaq-test.example.com/documentos/importar' => Http::response(['error' => 'Server Error'], 500),
    ]);

    Invoice::factory()->create([
        'org_id' => $this->org->id,
        'period' => '2026-03',
    ]);

    $result = $this->service->exportInvoices($this->org, '2026-03');

    expect($result['success'])->toBeFalse();
    expect($result['message'])->toContain('500');
    expect($result['exported_count'])->toBe(0);
});

// ──────────────────────────────────────────────────────────────────────
// Catalog Sync
// ──────────────────────────────────────────────────────────────────────

test('syncs catalog to CONTPAQ successfully', function () {
    config([
        'services.contpaq.endpoint' => 'https://contpaq-test.example.com',
        'services.contpaq.api_key' => 'contpaq-test-key',
    ]);

    Http::fake([
        'https://contpaq-test.example.com/catalogo/sincronizar' => Http::response(['status' => 'ok'], 200),
    ]);

    $subscription = Subscription::factory()->create([
        'org_id' => $this->org->id,
        'status' => 'active',
    ]);

    $device = createDevice($this->site, ['model' => 'EM300-TH', 'status' => 'active']);

    SubscriptionItem::create([
        'subscription_id' => $subscription->id,
        'device_id' => $device->id,
        'sensor_model' => 'EM300-TH',
        'monthly_fee' => 150.00,
    ]);

    $result = $this->service->syncCatalog($this->org);

    expect($result['success'])->toBeTrue();
    expect($result['synced_count'])->toBe(1);
    expect($result['message'])->toContain('Synced 1 catalog item(s)');

    Http::assertSent(function ($request) {
        return $request->url() === 'https://contpaq-test.example.com/catalogo/sincronizar';
    });
});

test('handles missing config for catalog sync', function () {
    config([
        'services.contpaq.endpoint' => null,
        'services.contpaq.api_key' => null,
    ]);

    $result = $this->service->syncCatalog($this->org);

    expect($result['success'])->toBeFalse();
    expect($result['message'])->toContain('not configured');
    expect($result['synced_count'])->toBe(0);
});

test('returns success with zero items when no catalog to sync', function () {
    config([
        'services.contpaq.endpoint' => 'https://contpaq-test.example.com',
        'services.contpaq.api_key' => 'contpaq-test-key',
    ]);

    // No subscriptions, no items
    $result = $this->service->syncCatalog($this->org);

    expect($result['success'])->toBeTrue();
    expect($result['synced_count'])->toBe(0);
    expect($result['message'])->toContain('No catalog items');
});

test('deduplicates sensor models in catalog sync', function () {
    config([
        'services.contpaq.endpoint' => 'https://contpaq-test.example.com',
        'services.contpaq.api_key' => 'contpaq-test-key',
    ]);

    Http::fake([
        'https://contpaq-test.example.com/catalogo/sincronizar' => Http::response(['status' => 'ok'], 200),
    ]);

    $subscription = Subscription::factory()->create([
        'org_id' => $this->org->id,
        'status' => 'active',
    ]);

    $device1 = createDevice($this->site, ['model' => 'EM300-TH', 'status' => 'active']);
    $device2 = createDevice($this->site, ['model' => 'EM300-TH', 'status' => 'active']);

    SubscriptionItem::create([
        'subscription_id' => $subscription->id,
        'device_id' => $device1->id,
        'sensor_model' => 'EM300-TH',
        'monthly_fee' => 150.00,
    ]);

    SubscriptionItem::create([
        'subscription_id' => $subscription->id,
        'device_id' => $device2->id,
        'sensor_model' => 'EM300-TH',
        'monthly_fee' => 150.00,
    ]);

    $result = $this->service->syncCatalog($this->org);

    expect($result['synced_count'])->toBe(1); // Deduplicated
});

test('updates integration config on successful CONTPAQ export', function () {
    config([
        'services.contpaq.endpoint' => 'https://contpaq-test.example.com',
        'services.contpaq.api_key' => 'contpaq-test-key',
    ]);

    Http::fake([
        'https://contpaq-test.example.com/documentos/importar' => Http::response(['status' => 'ok'], 200),
    ]);

    Invoice::factory()->create([
        'org_id' => $this->org->id,
        'period' => '2026-03',
    ]);

    $this->service->exportInvoices($this->org, '2026-03');

    $this->assertDatabaseHas('integration_configs', [
        'org_id' => $this->org->id,
        'type' => 'contpaq',
    ]);
});
