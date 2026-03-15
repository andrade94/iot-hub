<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('door_baselines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained('devices')->cascadeOnDelete();
            $table->tinyInteger('day_of_week');
            $table->tinyInteger('hour');
            $table->double('avg_opens')->default(0);
            $table->double('avg_duration')->default(0);
            $table->double('std_dev_opens')->default(0);
            $table->timestamps();

            $table->unique(['device_id', 'day_of_week', 'hour']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('door_baselines');
    }
};
