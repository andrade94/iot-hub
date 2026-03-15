<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('segment');
            $table->string('plan')->default('starter');
            $table->json('settings')->nullable();
            $table->string('logo')->nullable();
            $table->time('default_opening_hour')->nullable();
            $table->string('default_timezone')->default('America/Mexico_City');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
