<?php

use App\Services\Decoders\DecoderFactory;
use App\Services\Decoders\MilesightDecoder;

test('MilesightDecoder decodes EM300-TH payload correctly', function () {
    $decoder = new MilesightDecoder;

    // Little-endian format (as sent by real Milesight sensors)
    // temp=24.5°C: 245 = 0x00F5 → LE bytes: F5 00
    // humidity=55%: 110 = 0x6E (single byte, /2 = 55%)
    // battery=85%: 0x55 (single byte)
    $payload = '0167F5000268' . sprintf('%02X', 110) . '0375' . sprintf('%02X', 85);

    $readings = $decoder->decode('EM300-TH', $payload);

    expect($readings)->toHaveKey('temperature')
        ->toHaveKey('humidity')
        ->toHaveKey('battery');

    expect($readings['temperature']['value'])->toBe(24.5)
        ->and($readings['temperature']['unit'])->toBe('°C');
    expect((float) $readings['humidity']['value'])->toBe(55.0)
        ->and($readings['humidity']['unit'])->toBe('%');
    expect((float) $readings['battery']['value'])->toBe(85.0);
});

test('MilesightDecoder handles negative temperatures', function () {
    $decoder = new MilesightDecoder;

    // temp = -20.0°C → raw = -200 → unsigned = 65336 = 0xFF38
    // Little-endian bytes: 38 FF
    $payload = '016738FF';

    $readings = $decoder->decode('EM300-TH', $payload);

    expect($readings)->toHaveKey('temperature');
    expect((float) $readings['temperature']['value'])->toBe(-20.0);
});

test('MilesightDecoder decodes WS301 door open', function () {
    $decoder = new MilesightDecoder;

    // Door open (1), battery 95%
    $payload = '030001' . '0475' . sprintf('%02X', 95);

    $readings = $decoder->decode('WS301', $payload);

    expect($readings)->toHaveKey('door_status')
        ->toHaveKey('battery');
    expect($readings['door_status']['value'])->toBe(1.0);
    expect($readings['battery']['value'])->toBe(95.0);
});

test('MilesightDecoder decodes AM307 IAQ payload', function () {
    $decoder = new MilesightDecoder;

    // All values in little-endian:
    // temp=23.0°C: 230 = 0x00E6 → LE: E6 00
    // humidity=45%: 90 = 0x5A (single byte)
    // CO2=450ppm: 0x01C2 → LE: C2 01
    // TVOC=100ppb: 0x0064 → LE: 64 00
    $payload = '0167E600' . '02685A' . '037DC201' . '047D6400';

    $readings = $decoder->decode('AM307', $payload);

    expect($readings)->toHaveKey('temperature')
        ->toHaveKey('humidity')
        ->toHaveKey('co2')
        ->toHaveKey('tvoc');

    expect((float) $readings['temperature']['value'])->toBe(23.0);
    expect((float) $readings['co2']['value'])->toBe(450.0);
    expect($readings['co2']['unit'])->toBe('ppm');
});

test('DecoderFactory routes to correct decoder', function () {
    $factory = new DecoderFactory;

    expect($factory->hasDecoder('EM300-TH'))->toBeTrue()
        ->and($factory->hasDecoder('CT101'))->toBeTrue()
        ->and($factory->hasDecoder('WS301'))->toBeTrue()
        ->and($factory->hasDecoder('UNKNOWN'))->toBeFalse();
});

test('DecoderFactory throws for unknown model', function () {
    $factory = new DecoderFactory;
    $factory->decode('UNKNOWN-MODEL', 'AABB');
})->throws(InvalidArgumentException::class);
