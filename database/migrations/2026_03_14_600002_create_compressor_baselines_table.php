<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compressor_baselines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('device_id')->constrained('devices')->cascadeOnDelete();
            $table->date('date');
            $table->double('duty_cycle_pct');
            $table->integer('on_count')->default(0);
            $table->double('avg_on_duration')->default(0);
            $table->double('avg_off_duration')->default(0);
            $table->double('degradation_score')->default(0);
            $table->timestamps();

            $table->unique(['device_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compressor_baselines');
    }
};
