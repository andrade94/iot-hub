<?php

namespace App\Services\ChirpStack;

use App\Models\Device;
use App\Models\Gateway;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DeviceProvisioner
{
    protected string $baseUrl;

    protected string $apiKey;

    protected string $tenantId;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.chirpstack.url', ''), '/');
        $this->apiKey = config('services.chirpstack.api_key', '');
        $this->tenantId = config('services.chirpstack.tenant_id', '');
    }

    /**
     * Register a device in ChirpStack.
     */
    public function provisionDevice(Device $device, string $applicationId, string $deviceProfileId): bool
    {
        try {
            $response = Http::withHeaders([
                'Grpc-Metadata-Authorization' => "Bearer {$this->apiKey}",
            ])->post("{$this->baseUrl}/api/devices", [
                'device' => [
                    'devEui' => $device->dev_eui,
                    'name' => $device->name,
                    'applicationId' => $applicationId,
                    'deviceProfileId' => $deviceProfileId,
                    'isDisabled' => false,
                ],
            ]);

            if ($response->successful()) {
                // Set device keys (OTAA)
                if ($device->app_key) {
                    $this->setDeviceKeys($device);
                }

                $device->update([
                    'status' => 'provisioned',
                    'provisioned_at' => now(),
                ]);

                Log::info('Device provisioned in ChirpStack', [
                    'dev_eui' => $device->dev_eui,
                    'name' => $device->name,
                ]);

                return true;
            }

            Log::error('ChirpStack device provisioning failed', [
                'dev_eui' => $device->dev_eui,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return false;
        } catch (\Exception $e) {
            Log::error('ChirpStack device provisioning error', [
                'dev_eui' => $device->dev_eui,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Set OTAA keys for a device.
     */
    protected function setDeviceKeys(Device $device): bool
    {
        $response = Http::withHeaders([
            'Grpc-Metadata-Authorization' => "Bearer {$this->apiKey}",
        ])->post("{$this->baseUrl}/api/devices/{$device->dev_eui}/keys", [
            'deviceKeys' => [
                'devEui' => $device->dev_eui,
                'nwkKey' => $device->app_key,
            ],
        ]);

        return $response->successful();
    }

    /**
     * Register a gateway in ChirpStack.
     */
    public function provisionGateway(Gateway $gateway): bool
    {
        try {
            $response = Http::withHeaders([
                'Grpc-Metadata-Authorization' => "Bearer {$this->apiKey}",
            ])->post("{$this->baseUrl}/api/gateways", [
                'gateway' => [
                    'gatewayId' => $gateway->serial,
                    'name' => "{$gateway->model} - {$gateway->serial}",
                    'tenantId' => $this->tenantId,
                ],
            ]);

            if ($response->successful()) {
                $gateway->update([
                    'chirpstack_id' => $gateway->serial,
                    'status' => 'registered',
                ]);

                Log::info('Gateway provisioned in ChirpStack', [
                    'serial' => $gateway->serial,
                ]);

                return true;
            }

            Log::error('ChirpStack gateway provisioning failed', [
                'serial' => $gateway->serial,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return false;
        } catch (\Exception $e) {
            Log::error('ChirpStack gateway provisioning error', [
                'serial' => $gateway->serial,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Remove a device from ChirpStack.
     */
    public function deprovisionDevice(Device $device): bool
    {
        try {
            $response = Http::withHeaders([
                'Grpc-Metadata-Authorization' => "Bearer {$this->apiKey}",
            ])->delete("{$this->baseUrl}/api/devices/{$device->dev_eui}");

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('ChirpStack device deprovisioning error', [
                'dev_eui' => $device->dev_eui,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
