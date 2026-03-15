<?php

use App\Jobs\EvaluateAlertRules;
use App\Services\RulesEngine\RuleEvaluator;

beforeEach(function () {
    $this->org = createOrg();
    $this->site = createSite($this->org);
});

test('delegates to RuleEvaluator for existing device', function () {
    $device = createDevice($this->site);
    $readings = ['temperature' => ['value' => 10.5, 'unit' => '°C']];

    $evaluator = Mockery::mock(RuleEvaluator::class);
    $evaluator->shouldReceive('evaluate')
        ->once()
        ->with(Mockery::on(fn ($d) => $d->id === $device->id), $readings);

    app()->instance(RuleEvaluator::class, $evaluator);

    (new EvaluateAlertRules($device->id, $readings))->handle($evaluator);
});

test('handles missing device gracefully', function () {
    $evaluator = Mockery::mock(RuleEvaluator::class);
    $evaluator->shouldNotReceive('evaluate');

    (new EvaluateAlertRules(99999, ['temperature' => ['value' => 5.0, 'unit' => '°C']]))->handle($evaluator);
});

test('passes readings array to evaluator', function () {
    $device = createDevice($this->site);
    $readings = [
        'temperature' => ['value' => 4.5, 'unit' => '°C'],
        'humidity' => ['value' => 65.0, 'unit' => '%'],
    ];

    $evaluator = Mockery::mock(RuleEvaluator::class);
    $evaluator->shouldReceive('evaluate')
        ->once()
        ->with(Mockery::any(), $readings);

    (new EvaluateAlertRules($device->id, $readings))->handle($evaluator);
});
