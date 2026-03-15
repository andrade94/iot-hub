<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_modules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->foreignId('module_id')->constrained('modules')->cascadeOnDelete();
            $table->timestamp('activated_at')->nullable();
            $table->json('config')->nullable();
            $table->timestamps();

            $table->unique(['site_id', 'module_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_modules');
    }
};
