<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->timestamp('assigned_at')->nullable()->after('assigned_to');
            $table->timestamp('started_at')->nullable()->after('assigned_at');
            $table->timestamp('completed_at')->nullable()->after('started_at');
        });

        // Backfill — for historical rows, infer from updated_at of the current terminal state.
        // This is imperfect but better than nothing; new rows will track precisely going forward.
        DB::statement("UPDATE work_orders SET completed_at = updated_at WHERE status = 'completed' AND completed_at IS NULL");
        DB::statement("UPDATE work_orders SET started_at = updated_at WHERE status IN ('in_progress', 'completed') AND started_at IS NULL");
        DB::statement("UPDATE work_orders SET assigned_at = updated_at WHERE status IN ('assigned', 'in_progress', 'completed') AND assigned_at IS NULL");
    }

    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropColumn(['assigned_at', 'started_at', 'completed_at']);
        });
    }
};
