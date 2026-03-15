<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('traffic_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->string('zone')->nullable();
            $table->date('date');
            $table->tinyInteger('hour');
            $table->double('occupancy_avg')->default(0);
            $table->integer('occupancy_peak')->default(0);
            $table->timestamps();

            $table->index(['site_id', 'date', 'hour']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('traffic_snapshots');
    }
};
