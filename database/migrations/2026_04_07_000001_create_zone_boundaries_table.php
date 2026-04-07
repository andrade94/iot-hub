<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zone_boundaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->foreignId('floor_plan_id')->constrained('floor_plans')->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 7)->default('#06b6d4');
            $table->float('x');
            $table->float('y');
            $table->float('width');
            $table->float('height');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zone_boundaries');
    }
};
