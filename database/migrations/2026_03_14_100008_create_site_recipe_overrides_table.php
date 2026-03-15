<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_recipe_overrides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_id')->constrained()->cascadeOnDelete();
            $table->foreignId('recipe_id')->constrained()->cascadeOnDelete();
            $table->json('overridden_rules');
            $table->unsignedBigInteger('overridden_by')->nullable();
            $table->timestamps();

            $table->unique(['site_id', 'recipe_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_recipe_overrides');
    }
};
