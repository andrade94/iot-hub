<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('iaq_zone_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->string('zone');
            $table->date('date');
            $table->double('avg_co2')->nullable();
            $table->double('avg_temp')->nullable();
            $table->double('avg_humidity')->nullable();
            $table->double('avg_tvoc')->nullable();
            $table->double('comfort_score')->nullable();
            $table->timestamps();

            $table->unique(['site_id', 'zone', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('iaq_zone_scores');
    }
};
