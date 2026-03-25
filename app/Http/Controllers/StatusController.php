<?php

namespace App\Http\Controllers;

use App\Models\SensorReading;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redis;
use Inertia\Inertia;

class StatusController extends Controller
{
    public function __invoke()
    {
        $services = [
            $this->checkWebApp(),
            $this->checkMobileApi(),
            $this->checkMqttPipeline(),
            $this->checkWhatsApp(),
            $this->checkPushNotifications(),
        ];

        return Inertia::render('status', [
            'services' => $services,
            'checkedAt' => now()->toIso8601String(),
        ]);
    }

    private function checkWebApp(): array
    {
        try {
            DB::connection()->getPdo();
            $status = 'operational';
        } catch (\Throwable) {
            $status = 'down';
        }

        return [
            'name' => 'Web Application',
            'slug' => 'web_app',
            'status' => $status,
            'description' => 'Main web dashboard and management interface',
        ];
    }

    private function checkMobileApi(): array
    {
        try {
            DB::connection()->getPdo();
            $status = 'operational';
        } catch (\Throwable) {
            $status = 'down';
        }

        return [
            'name' => 'Mobile API',
            'slug' => 'mobile_api',
            'status' => $status,
            'description' => 'REST API for the Astrea mobile companion app',
        ];
    }

    private function checkMqttPipeline(): array
    {
        try {
            $lastReading = SensorReading::orderByDesc('time')->value('time');
            if ($lastReading && $lastReading->diffInMinutes(now()) < 30) {
                $status = 'operational';
            } elseif ($lastReading) {
                $status = 'degraded';
            } else {
                $status = 'degraded';
            }
        } catch (\Throwable) {
            $status = 'degraded';
        }

        return [
            'name' => 'MQTT Pipeline',
            'slug' => 'mqtt_pipeline',
            'status' => $status,
            'description' => 'Sensor data ingestion via LoRaWAN/MQTT',
        ];
    }

    private function checkWhatsApp(): array
    {
        // Stub: check would verify WhatsApp Business API connectivity
        return [
            'name' => 'WhatsApp Alerts',
            'slug' => 'whatsapp',
            'status' => 'operational',
            'description' => 'WhatsApp Business API for alert notifications',
        ];
    }

    private function checkPushNotifications(): array
    {
        // Stub: check would verify Expo Push API connectivity
        return [
            'name' => 'Push Notifications',
            'slug' => 'push_notifications',
            'status' => 'operational',
            'description' => 'Mobile push notifications via Expo',
        ];
    }
}
