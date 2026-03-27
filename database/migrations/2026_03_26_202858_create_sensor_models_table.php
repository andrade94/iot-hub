<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sensor_models', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('label');
            $table->string('manufacturer')->default('Milesight');
            $table->text('description')->nullable();
            $table->json('supported_metrics');
            $table->json('valid_ranges')->nullable();
            $table->decimal('monthly_fee', 10, 2)->nullable();
            $table->string('decoder_class')->nullable();
            $table->string('icon')->nullable();
            $table->string('color')->nullable();
            $table->boolean('active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sensor_models');
    }
};
