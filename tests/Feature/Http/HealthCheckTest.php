<?php

use App\Models\SensorReading;

test('health check returns 200 when all systems healthy', function () {
    $response = $this->getJson('/health');

    $response->assertOk()
        ->assertJson([
            'status' => 'ok',
            'checks' => [
                'db' => true,
                'redis' => true,
            ],
        ])
        ->assertJsonStructure([
            'status',
            'checks' => ['db', 'redis', 'queue_depth', 'last_mqtt_reading_at'],
            'timestamp',
        ]);
});

test('health check is accessible without authentication', function () {
    $response = $this->getJson('/health');

    $response->assertOk();
    // Not redirected to login
    $response->assertJsonStructure(['status']);
});

test('health check includes last reading timestamp', function () {
    $org = createOrg();
    $site = createSite($org);
    $device = createDevice($site);

    SensorReading::create([
        'device_id' => $device->id,
        'time' => now(),
        'metric' => 'temperature',
        'value' => 22.5,
    ]);

    $response = $this->getJson('/health');

    $response->assertOk();
    $data = $response->json();
    expect($data['checks']['last_mqtt_reading_at'])->not->toBeNull();
});

test('health check returns queue depth as integer', function () {
    $response = $this->getJson('/health');

    $data = $response->json();
    expect($data['checks']['queue_depth'])->toBeInt();
});
