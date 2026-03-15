<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->foreignId('gateway_id')->nullable()->constrained('gateways')->nullOnDelete();
            $table->string('model');
            $table->string('dev_eui')->unique();
            $table->text('app_key')->nullable(); // Encrypted via Laravel's Crypt facade
            $table->string('name');
            $table->string('zone')->nullable();
            $table->foreignId('floor_id')->nullable()->constrained('floor_plans')->nullOnDelete();
            $table->integer('floor_x')->nullable();
            $table->integer('floor_y')->nullable();
            $table->foreignId('recipe_id')->nullable()->constrained('recipes')->nullOnDelete();
            $table->timestamp('installed_at')->nullable();
            $table->integer('battery_pct')->nullable();
            $table->integer('rssi')->nullable();
            $table->timestamp('last_reading_at')->nullable();
            $table->string('status')->default('pending');
            $table->timestamp('provisioned_at')->nullable();
            $table->unsignedBigInteger('provisioned_by')->nullable();
            $table->unsignedBigInteger('replaced_device_id')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devices');
    }
};
