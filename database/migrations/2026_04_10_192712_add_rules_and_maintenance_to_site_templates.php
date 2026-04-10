<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_templates', function (Blueprint $table) {
            $table->json('alert_rules')->nullable()->after('recipe_assignments');
            $table->json('maintenance_windows')->nullable()->after('alert_rules');
        });
    }

    public function down(): void
    {
        Schema::table('site_templates', function (Blueprint $table) {
            $table->dropColumn(['alert_rules', 'maintenance_windows']);
        });
    }
};
