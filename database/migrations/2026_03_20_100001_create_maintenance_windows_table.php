<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenance_windows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_id')->constrained()->cascadeOnDelete();
            $table->string('zone')->nullable(); // null = entire site
            $table->string('title');
            $table->string('recurrence')->default('once'); // once, daily, weekly, monthly
            $table->unsignedTinyInteger('day_of_week')->nullable(); // 0=Sun..6=Sat (for weekly)
            $table->time('start_time');
            $table->unsignedSmallInteger('duration_minutes')->default(60);
            $table->boolean('suppress_alerts')->default(true);
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['site_id', 'zone']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_windows');
    }
};
