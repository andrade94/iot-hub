<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('alerts', function (Blueprint $table) {
            $table->unsignedBigInteger('acknowledged_by')->nullable()->after('acknowledged_at');
            $table->timestamp('escalated_at')->nullable()->after('resolution_type');
            $table->unsignedBigInteger('escalated_by')->nullable()->after('escalated_at');
            $table->unsignedInteger('escalated_to_level')->nullable()->after('escalated_by');
        });

        // Backfill: for already-acknowledged alerts, mirror resolved_by into acknowledged_by
        // so the audit trail is approximately correct for historical data.
        DB::statement('UPDATE alerts SET acknowledged_by = resolved_by WHERE acknowledged_at IS NOT NULL AND acknowledged_by IS NULL');
    }

    public function down(): void
    {
        Schema::table('alerts', function (Blueprint $table) {
            $table->dropColumn(['acknowledged_by', 'escalated_at', 'escalated_by', 'escalated_to_level']);
        });
    }
};
