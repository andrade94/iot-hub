<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('escalation_chains');

        Schema::create('escalation_chains', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->string('name');
            $table->json('levels'); // [{level, delay_minutes, user_ids, channels}]
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('escalation_chains');

        Schema::create('escalation_chains', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->integer('level');
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->integer('delay_minutes')->default(5);
            $table->string('channel')->default('push');
            $table->timestamps();
            $table->unique(['site_id', 'level']);
        });
    }
};
