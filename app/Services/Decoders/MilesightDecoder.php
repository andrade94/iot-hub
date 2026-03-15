<?php

namespace App\Services\Decoders;

class MilesightDecoder
{
    /**
     * Decode a hex payload from a Milesight sensor.
     *
     * @return array<string, array{value: float, unit: string}>
     */
    public function decode(string $deviceModel, string $payload): array
    {
        $bytes = $this->hexToBytes($payload);

        return match ($deviceModel) {
            'EM300-TH' => $this->decodeEM300TH($bytes),
            'CT101' => $this->decodeCT101($bytes),
            'WS301' => $this->decodeWS301($bytes),
            'GS101' => $this->decodeGS101($bytes),
            'EM300-PT' => $this->decodeEM300PT($bytes),
            'EM310-UDL' => $this->decodeEM310UDL($bytes),
            'AM307' => $this->decodeAM307($bytes),
            default => [],
        };
    }

    /**
     * EM300-TH: Temperature & Humidity sensor.
     */
    protected function decodeEM300TH(array $bytes): array
    {
        $readings = [];

        $i = 0;
        while ($i < count($bytes)) {
            $channel = $bytes[$i++] ?? null;
            $type = $bytes[$i++] ?? null;

            if ($channel === null || $type === null) {
                break;
            }

            if ($channel === 0x01 && $type === 0x67) {
                // Temperature: 2 bytes, signed, /10
                $temp = $this->readInt16($bytes, $i);
                $readings['temperature'] = ['value' => $temp / 10, 'unit' => '°C'];
                $i += 2;
            } elseif ($channel === 0x02 && $type === 0x68) {
                // Humidity: 1 byte, /2
                $readings['humidity'] = ['value' => ($bytes[$i] ?? 0) / 2, 'unit' => '%'];
                $i += 1;
            } elseif ($channel === 0x03 && $type === 0x75) {
                // Battery: 1 byte
                $readings['battery'] = ['value' => (float) ($bytes[$i] ?? 0), 'unit' => '%'];
                $i += 1;
            } else {
                break;
            }
        }

        return $readings;
    }

    /**
     * CT101: Current Transformer (energy monitoring).
     */
    protected function decodeCT101(array $bytes): array
    {
        $readings = [];

        $i = 0;
        while ($i < count($bytes)) {
            $channel = $bytes[$i++] ?? null;
            $type = $bytes[$i++] ?? null;

            if ($channel === null || $type === null) {
                break;
            }

            if ($channel === 0x01 && $type === 0x99) {
                // Current: 4 bytes, /1000
                $current = $this->readUint32($bytes, $i);
                $readings['current'] = ['value' => $current / 1000, 'unit' => 'A'];
                $i += 4;
            } elseif ($channel === 0x02 && $type === 0x9A) {
                // Power factor: 1 byte
                $readings['power_factor'] = ['value' => (float) ($bytes[$i] ?? 0), 'unit' => ''];
                $i += 1;
            } elseif ($channel === 0x03 && $type === 0x75) {
                // Battery
                $readings['battery'] = ['value' => (float) ($bytes[$i] ?? 0), 'unit' => '%'];
                $i += 1;
            } else {
                break;
            }
        }

        return $readings;
    }

    /**
     * WS301: Door/Window sensor.
     */
    protected function decodeWS301(array $bytes): array
    {
        $readings = [];

        $i = 0;
        while ($i < count($bytes)) {
            $channel = $bytes[$i++] ?? null;
            $type = $bytes[$i++] ?? null;

            if ($channel === null || $type === null) {
                break;
            }

            if ($channel === 0x03 && $type === 0x00) {
                // Door status: 0=closed, 1=open
                $readings['door_status'] = ['value' => (float) ($bytes[$i] ?? 0), 'unit' => ''];
                $i += 1;
            } elseif ($channel === 0x04 && $type === 0x75) {
                // Battery
                $readings['battery'] = ['value' => (float) ($bytes[$i] ?? 0), 'unit' => '%'];
                $i += 1;
            } else {
                break;
            }
        }

        return $readings;
    }

    /**
     * GS101: Gas Leak detector.
     */
    protected function decodeGS101(array $bytes): array
    {
        $readings = [];

        $i = 0;
        while ($i < count($bytes)) {
            $channel = $bytes[$i++] ?? null;
            $type = $bytes[$i++] ?? null;

            if ($channel === null || $type === null) {
                break;
            }

            if ($channel === 0x01 && $type === 0x01) {
                // Gas alarm: 0=normal, 1=alarm
                $readings['gas_alarm'] = ['value' => (float) ($bytes[$i] ?? 0), 'unit' => ''];
                $i += 1;
            } elseif ($channel === 0x02 && $type === 0x02) {
                // Gas concentration: 2 bytes
                $readings['gas_concentration'] = ['value' => (float) $this->readUint16($bytes, $i), 'unit' => 'ppm'];
                $i += 2;
            } else {
                break;
            }
        }

        return $readings;
    }

    /**
     * EM300-PT: Pressure & Temperature sensor.
     */
    protected function decodeEM300PT(array $bytes): array
    {
        $readings = [];

        $i = 0;
        while ($i < count($bytes)) {
            $channel = $bytes[$i++] ?? null;
            $type = $bytes[$i++] ?? null;

            if ($channel === null || $type === null) {
                break;
            }

            if ($channel === 0x01 && $type === 0x67) {
                // Temperature
                $temp = $this->readInt16($bytes, $i);
                $readings['temperature'] = ['value' => $temp / 10, 'unit' => '°C'];
                $i += 2;
            } elseif ($channel === 0x02 && $type === 0x73) {
                // Pressure: 2 bytes, /10
                $pressure = $this->readUint16($bytes, $i);
                $readings['pressure'] = ['value' => $pressure / 10, 'unit' => 'kPa'];
                $i += 2;
            } elseif ($channel === 0x03 && $type === 0x75) {
                // Battery
                $readings['battery'] = ['value' => (float) ($bytes[$i] ?? 0), 'unit' => '%'];
                $i += 1;
            } else {
                break;
            }
        }

        return $readings;
    }

    /**
     * EM310-UDL: Ultrasonic Distance/Level sensor.
     */
    protected function decodeEM310UDL(array $bytes): array
    {
        $readings = [];

        $i = 0;
        while ($i < count($bytes)) {
            $channel = $bytes[$i++] ?? null;
            $type = $bytes[$i++] ?? null;

            if ($channel === null || $type === null) {
                break;
            }

            if ($channel === 0x01 && $type === 0x82) {
                // Distance: 2 bytes, mm
                $distance = $this->readUint16($bytes, $i);
                $readings['distance'] = ['value' => (float) $distance, 'unit' => 'mm'];
                $i += 2;
            } elseif ($channel === 0x03 && $type === 0x75) {
                // Battery
                $readings['battery'] = ['value' => (float) ($bytes[$i] ?? 0), 'unit' => '%'];
                $i += 1;
            } else {
                break;
            }
        }

        return $readings;
    }

    /**
     * AM307: Indoor Air Quality sensor (CO2, temp, humidity, TVOC, etc.).
     */
    protected function decodeAM307(array $bytes): array
    {
        $readings = [];

        $i = 0;
        while ($i < count($bytes)) {
            $channel = $bytes[$i++] ?? null;
            $type = $bytes[$i++] ?? null;

            if ($channel === null || $type === null) {
                break;
            }

            if ($channel === 0x01 && $type === 0x67) {
                // Temperature
                $temp = $this->readInt16($bytes, $i);
                $readings['temperature'] = ['value' => $temp / 10, 'unit' => '°C'];
                $i += 2;
            } elseif ($channel === 0x02 && $type === 0x68) {
                // Humidity
                $readings['humidity'] = ['value' => ($bytes[$i] ?? 0) / 2, 'unit' => '%'];
                $i += 1;
            } elseif ($channel === 0x03 && $type === 0x7D) {
                // CO2: 2 bytes
                $co2 = $this->readUint16($bytes, $i);
                $readings['co2'] = ['value' => (float) $co2, 'unit' => 'ppm'];
                $i += 2;
            } elseif ($channel === 0x04 && $type === 0x7D) {
                // TVOC: 2 bytes
                $tvoc = $this->readUint16($bytes, $i);
                $readings['tvoc'] = ['value' => (float) $tvoc, 'unit' => 'ppb'];
                $i += 2;
            } elseif ($channel === 0x05 && $type === 0x73) {
                // Barometric pressure: 2 bytes, /10
                $pressure = $this->readUint16($bytes, $i);
                $readings['pressure'] = ['value' => $pressure / 10, 'unit' => 'hPa'];
                $i += 2;
            } elseif ($channel === 0x06 && $type === 0x75) {
                // Battery
                $readings['battery'] = ['value' => (float) ($bytes[$i] ?? 0), 'unit' => '%'];
                $i += 1;
            } else {
                break;
            }
        }

        return $readings;
    }

    /**
     * Convert hex string to byte array.
     *
     * @return int[]
     */
    protected function hexToBytes(string $hex): array
    {
        $hex = preg_replace('/[^0-9a-fA-F]/', '', $hex);
        $bytes = [];
        for ($i = 0; $i < strlen($hex); $i += 2) {
            $bytes[] = hexdec(substr($hex, $i, 2));
        }

        return $bytes;
    }

    /**
     * Read signed 16-bit integer (little-endian).
     */
    protected function readInt16(array $bytes, int $offset): int
    {
        $val = ($bytes[$offset + 1] ?? 0) << 8 | ($bytes[$offset] ?? 0);
        if ($val >= 0x8000) {
            $val -= 0x10000;
        }

        return $val;
    }

    /**
     * Read unsigned 16-bit integer (little-endian).
     */
    protected function readUint16(array $bytes, int $offset): int
    {
        return ($bytes[$offset + 1] ?? 0) << 8 | ($bytes[$offset] ?? 0);
    }

    /**
     * Read unsigned 32-bit integer (little-endian).
     */
    protected function readUint32(array $bytes, int $offset): int
    {
        return ($bytes[$offset + 3] ?? 0) << 24
            | ($bytes[$offset + 2] ?? 0) << 16
            | ($bytes[$offset + 1] ?? 0) << 8
            | ($bytes[$offset] ?? 0);
    }
}
