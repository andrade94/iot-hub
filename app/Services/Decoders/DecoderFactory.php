<?php

namespace App\Services\Decoders;

use InvalidArgumentException;

class DecoderFactory
{
    /**
     * Decoder registry: device model → decoder class.
     */
    protected array $decoders = [
        'EM300-TH' => MilesightDecoder::class,
        'CT101' => MilesightDecoder::class,
        'WS301' => MilesightDecoder::class,
        'GS101' => MilesightDecoder::class,
        'EM300-PT' => MilesightDecoder::class,
        'EM310-UDL' => MilesightDecoder::class,
        'AM307' => MilesightDecoder::class,
    ];

    /**
     * Decode a raw payload for the given device model.
     *
     * @return array<string, array{value: float, unit: string}>
     */
    public function decode(string $deviceModel, string $payload): array
    {
        $decoderClass = $this->decoders[$deviceModel] ?? null;

        if (! $decoderClass) {
            throw new InvalidArgumentException("No decoder registered for model: {$deviceModel}");
        }

        /** @var MilesightDecoder $decoder */
        $decoder = app($decoderClass);

        return $decoder->decode($deviceModel, $payload);
    }

    /**
     * Register a custom decoder for a device model.
     */
    public function register(string $deviceModel, string $decoderClass): void
    {
        $this->decoders[$deviceModel] = $decoderClass;
    }

    /**
     * Check if a decoder exists for the given model.
     */
    public function hasDecoder(string $deviceModel): bool
    {
        return isset($this->decoders[$deviceModel]);
    }
}
