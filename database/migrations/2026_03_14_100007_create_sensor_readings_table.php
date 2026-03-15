<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sensor_readings', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->timestamp('time')->index();
            $table->foreignId('device_id')->constrained('devices')->cascadeOnDelete();
            $table->string('metric');
            $table->double('value');
            $table->string('unit')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['device_id', 'metric', 'time']);
        });

        // In production with TimescaleDB, run:
        // SELECT create_hypertable('sensor_readings', 'time');
    }

    public function down(): void
    {
        Schema::dropIfExists('sensor_readings');
    }
};
