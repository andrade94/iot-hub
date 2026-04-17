<?php

namespace App\Console\Commands;

use App\Services\ChirpStack\MqttListener;
use Illuminate\Console\Command;
use PhpMqtt\Client\Facades\MQTT;

class MqttListen extends Command
{
    protected $signature = 'mqtt:listen
        {--topic=application/+/device/+/event/up : ChirpStack MQTT topic pattern}
        {--gateway-topic=gateway/+/event/status : Gateway status topic pattern}';

    protected $description = 'Subscribe to ChirpStack MQTT broker and process uplink messages through the sensor pipeline';

    private int $messagesProcessed = 0;

    private int $errorsCount = 0;

    public function handle(MqttListener $listener): int
    {
        $uplinkTopic = $this->option('topic');
        $gatewayTopic = $this->option('gateway-topic');

        $host = config('mqtt-client.connections.default.host');
        if (! $host) {
            $this->error('MQTT_HOST is not configured. Set it in your .env file.');
            $this->line('  MQTT_HOST=localhost');
            $this->line('  MQTT_PORT=1883');
            $this->line('  MQTT_AUTH_USERNAME=chirpstack');
            $this->line('  MQTT_AUTH_PASSWORD=your-password');

            return self::FAILURE;
        }

        $this->info("Connecting to MQTT broker at {$host}:" . config('mqtt-client.connections.default.port', 1883));

        try {
            $mqtt = MQTT::connection();
        } catch (\Throwable $e) {
            $this->error("Failed to connect to MQTT broker: {$e->getMessage()}");

            return self::FAILURE;
        }

        $this->info("Connected. Subscribing to topics...");

        // Subscribe to device uplinks (the main data pipeline)
        $mqtt->subscribe($uplinkTopic, function (string $topic, string $message) use ($listener) {
            try {
                $payload = json_decode($message, true, 512, JSON_THROW_ON_ERROR);
                $listener->handleUplink($payload);
                $this->messagesProcessed++;

                if ($this->messagesProcessed % 100 === 0) {
                    $this->line("  [{$this->messagesProcessed} messages processed, {$this->errorsCount} errors]");
                }
            } catch (\JsonException $e) {
                $this->errorsCount++;
                $this->warn("Invalid JSON on {$topic}: {$e->getMessage()}");
            } catch (\Throwable $e) {
                $this->errorsCount++;
                $this->error("Error processing uplink: {$e->getMessage()}");
                report($e);
            }
        }, qualityOfService: 1);

        $this->info("  ✓ Subscribed to: {$uplinkTopic}");

        // Subscribe to gateway status events
        $mqtt->subscribe($gatewayTopic, function (string $topic, string $message) use ($listener) {
            try {
                $payload = json_decode($message, true, 512, JSON_THROW_ON_ERROR);
                $listener->handleGatewayStatus($payload);
            } catch (\Throwable $e) {
                $this->warn("Error processing gateway status: {$e->getMessage()}");
            }
        }, qualityOfService: 0);

        $this->info("  ✓ Subscribed to: {$gatewayTopic}");
        $this->info('');
        $this->info('Listening for messages... (Ctrl+C to stop)');
        $this->info('Pipeline: MQTT → MqttListener → ProcessSensorReading → EvaluateAlertRules');
        $this->info('');

        // Register graceful shutdown
        if (function_exists('pcntl_signal')) {
            pcntl_signal(SIGINT, function () use ($mqtt) {
                $this->info('');
                $this->info("Shutting down... ({$this->messagesProcessed} messages processed, {$this->errorsCount} errors)");
                $mqtt->disconnect();
            });
            pcntl_signal(SIGTERM, function () use ($mqtt) {
                $this->info("SIGTERM received. Disconnecting...");
                $mqtt->disconnect();
            });
        }

        // Block and loop — processes incoming messages
        $mqtt->loop(true);

        $this->info("Disconnected. Total: {$this->messagesProcessed} messages, {$this->errorsCount} errors.");

        return self::SUCCESS;
    }
}
