<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('files', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('original_name');
            $table->string('filename');
            $table->string('path');
            $table->string('disk')->default('public');
            $table->string('mime_type');
            $table->unsignedBigInteger('size');
            $table->string('extension', 10);
            $table->enum('visibility', ['public', 'private'])->default('public');
            $table->string('thumbnail_path')->nullable();
            $table->json('metadata')->nullable();
            $table->string('fileable_type')->nullable();
            $table->string('fileable_id')->nullable();
            $table->timestamps();

            $table->index(['fileable_type', 'fileable_id']);
            $table->index('visibility');
            $table->index('disk');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('files');
    }
};
