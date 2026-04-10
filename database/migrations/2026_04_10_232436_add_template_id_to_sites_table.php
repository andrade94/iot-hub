<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sites', function (Blueprint $table) {
            $table->foreignId('template_id')
                ->nullable()
                ->after('name')
                ->constrained('site_templates')
                ->nullOnDelete();
            $table->timestamp('template_applied_at')->nullable()->after('template_id');
            $table->index('template_id');
        });
    }

    public function down(): void
    {
        Schema::table('sites', function (Blueprint $table) {
            $table->dropConstrainedForeignId('template_id');
            $table->dropColumn('template_applied_at');
        });
    }
};
