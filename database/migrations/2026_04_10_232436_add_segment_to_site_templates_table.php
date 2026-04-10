<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_templates', function (Blueprint $table) {
            $table->string('segment')->nullable()->after('description');
            $table->index('segment');
        });

        // Backfill existing templates from their creator's org segment.
        // Using no table alias so the UPDATE works across SQLite / MySQL / PostgreSQL.
        DB::statement("
            UPDATE site_templates
            SET segment = (SELECT segment FROM organizations WHERE organizations.id = site_templates.org_id)
            WHERE segment IS NULL
        ");
    }

    public function down(): void
    {
        Schema::table('site_templates', function (Blueprint $table) {
            $table->dropIndex(['segment']);
            $table->dropColumn('segment');
        });
    }
};
