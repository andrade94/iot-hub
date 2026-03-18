<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compliance_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('site_id')->constrained('sites')->cascadeOnDelete();
            $table->foreignId('org_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('type'); // cofepris_audit, certificate_renewal, calibration, inspection, permit_renewal
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('due_date');
            $table->string('status')->default('upcoming'); // upcoming, overdue, completed, cancelled
            $table->date('completed_at')->nullable();
            $table->string('completed_by')->nullable();
            $table->json('reminders_sent')->nullable(); // tracks which reminders were sent
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compliance_events');
    }
};
