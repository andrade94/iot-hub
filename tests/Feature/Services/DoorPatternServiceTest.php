<?php

use App\Models\DoorBaseline;
use App\Models\SensorReading;
use App\Services\Analytics\DoorPatternService;

beforeEach(function () {
    $this->org = createOrg();
    $this->site = createSite($this->org);
    $this->device = createDevice($this->site);
    $this->service = new DoorPatternService;
});

test('learns baseline from sensor readings', function () {
    // Create door readings over multiple days
    for ($day = 0; $day < 3; $day++) {
        for ($hour = 8; $hour < 12; $hour++) {
            SensorReading::create([
                'time' => now()->subDays($day)->setHour($hour)->setMinute(0),
                'device_id' => $this->device->id,
                'metric' => 'door_status',
                'value' => 1,
                'unit' => '',
            ]);
        }
    }

    $upserted = $this->service->learnBaseline($this->device);

    expect($upserted)->toBeGreaterThan(0);
    expect(DoorBaseline::where('device_id', $this->device->id)->count())->toBeGreaterThan(0);
});

test('returns null for no anomaly when within threshold', function () {
    DoorBaseline::create([
        'device_id' => $this->device->id,
        'day_of_week' => now()->dayOfWeek,
        'hour' => now()->hour,
        'avg_opens' => 10,
        'avg_duration' => 30,
        'std_dev_opens' => 5,
    ]);

    $result = $this->service->checkAnomaly($this->device);

    expect($result)->toBeNull();
});

test('detects anomaly when opens exceed 2 std deviations', function () {
    $now = now();
    DoorBaseline::create([
        'device_id' => $this->device->id,
        'day_of_week' => $now->dayOfWeek,
        'hour' => $now->hour,
        'avg_opens' => 5,
        'avg_duration' => 30,
        'std_dev_opens' => 1, // Very tight std dev
    ]);

    // Create many door opens in current hour
    for ($i = 0; $i < 20; $i++) {
        SensorReading::create([
            'time' => $now->copy()->setMinute(rand(0, 59)),
            'device_id' => $this->device->id,
            'metric' => 'door_status',
            'value' => 1,
            'unit' => '',
        ]);
    }

    $result = $this->service->checkAnomaly($this->device);

    expect($result)->not->toBeNull();
    expect($result)->toHaveKey('deviation');
    expect($result)->toHaveKey('baseline_avg');
});

test('returns null when no baseline exists', function () {
    $result = $this->service->checkAnomaly($this->device);

    expect($result)->toBeNull();
});

test('returns null when std_dev is zero', function () {
    DoorBaseline::create([
        'device_id' => $this->device->id,
        'day_of_week' => now()->dayOfWeek,
        'hour' => now()->hour,
        'avg_opens' => 10,
        'avg_duration' => 30,
        'std_dev_opens' => 0,
    ]);

    $result = $this->service->checkAnomaly($this->device);

    expect($result)->toBeNull();
});
