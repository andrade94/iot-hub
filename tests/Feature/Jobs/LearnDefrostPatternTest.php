<?php

use App\Jobs\LearnDefrostPattern;
use App\Services\RulesEngine\DefrostDetector;

beforeEach(function () {
    $this->org = createOrg();
    $this->site = createSite($this->org);
});

test('skips device too new (<49h)', function () {
    $device = createDevice($this->site, ['installed_at' => now()->subHours(24)]);

    $detector = Mockery::mock(DefrostDetector::class);
    $detector->shouldNotReceive('analyzeSpikes');

    (new LearnDefrostPattern($device->id))->handle($detector);
});

test('skips missing device', function () {
    $detector = Mockery::mock(DefrostDetector::class);
    $detector->shouldNotReceive('analyzeSpikes');

    (new LearnDefrostPattern(99999))->handle($detector);
});

test('proceeds for device older than 49h', function () {
    $device = createDevice($this->site, ['installed_at' => now()->subHours(72)]);

    $detector = Mockery::mock(DefrostDetector::class);
    $detector->shouldReceive('analyzeSpikes')
        ->once()
        ->with(Mockery::on(fn ($d) => $d->id === $device->id), 48)
        ->andReturn([]);

    (new LearnDefrostPattern($device->id))->handle($detector);
});

test('creates schedule when pattern detected', function () {
    $device = createDevice($this->site, ['installed_at' => now()->subHours(72)]);

    $windows = [['start' => '02:00', 'end' => '02:30'], ['start' => '14:00', 'end' => '14:30']];
    $schedule = new \App\Models\DefrostSchedule;
    $schedule->id = 1;

    $detector = Mockery::mock(DefrostDetector::class);
    $detector->shouldReceive('analyzeSpikes')
        ->once()
        ->andReturn([
            ['time' => now()->subHours(30)->toIso8601String(), 'value' => 5.0],
            ['time' => now()->subHours(6)->toIso8601String(), 'value' => 5.0],
        ]);
    $detector->shouldReceive('detectPattern')
        ->once()
        ->andReturn($windows);
    $detector->shouldReceive('createSchedule')
        ->once()
        ->andReturn($schedule);

    (new LearnDefrostPattern($device->id))->handle($detector);
});
