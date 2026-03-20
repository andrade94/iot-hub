<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('outage_declarations', function (Blueprint $table) {
            $table->id();
            $table->text('reason');
            $table->json('affected_services');
            $table->string('status')->default('active');
            $table->foreignId('declared_by')->constrained('users');
            $table->timestamp('declared_at');
            $table->unsignedBigInteger('resolved_by')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->foreign('resolved_by')->references('id')->on('users')->nullOnDelete();
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('outage_declarations');
    }
};
