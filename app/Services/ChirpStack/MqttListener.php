<?php

namespace App\Services\ChirpStack;

use App\Jobs\ProcessSensorReading;
use App\Models\Device;
use Illuminate\Support\Facades\Log;

class MqttListener
{
    /**
     * Process an uplink message from ChirpStack MQTT.
     *
     * Expected payload structure (ChirpStack v4 JSON):
     * {
     *   "deviceInfo": { "devEui": "...", "deviceName": "..." },
     *   "data": "base64-encoded-payload",
     *   "rxInfo": [{ "rssi": -80, "snr": 7.5 }],
     *   "txInfo": { ... }
     * }
     */
    public function handleUplink(array $message): void
    {
        $devEui = $message['deviceInfo']['devEui'] ?? null;

        if (! $devEui) {
            Log::warning('MQTT uplink missing devEui', ['message' => $message]);

            return;
        }

        $device = Device::where('dev_eui', $devEui)->first();

        if (! $device) {
            Log::warning('MQTT uplink for unknown device', ['dev_eui' => $devEui]);

            return;
        }

        $payload = $message['data'] ?? null;
        if ($payload) {
            // ChirpStack sends base64-encoded data
            $hexPayload = bin2hex(base64_decode($payload));
        } else {
            Log::warning('MQTT uplink missing data', ['dev_eui' => $devEui]);

            return;
        }

        // Extract RSSI from rxInfo if available
        $rssi = null;
        if (! empty($message['rxInfo']) && is_array($message['rxInfo'])) {
            $rssi = $message['rxInfo'][0]['rssi'] ?? null;
        }

        ProcessSensorReading::dispatch(
            deviceId: $device->id,
            payload: $hexPayload,
            rssi: $rssi,
        );
    }

    /**
     * Process a gateway status event from ChirpStack.
     */
    public function handleGatewayStatus(array $message): void
    {
        $gatewayId = $message['gatewayId'] ?? null;

        if (! $gatewayId) {
            return;
        }

        $gateway = \App\Models\Gateway::where('chirpstack_id', $gatewayId)->first();

        if ($gateway) {
            $gateway->update([
                'last_seen_at' => now(),
                'status' => 'online',
            ]);
        }
    }
}
