<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('org_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('modules');
            $table->json('zone_config')->nullable();
            $table->json('recipe_assignments')->nullable();
            $table->json('escalation_structure')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->unique(['org_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_templates');
    }
};
