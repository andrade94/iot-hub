<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('org_id')->nullable()->constrained('organizations')->nullOnDelete();
            $table->string('phone')->nullable();
            $table->string('whatsapp_phone')->nullable();
            $table->boolean('has_app_access')->default(true);
            $table->tinyInteger('escalation_level')->nullable();
            $table->string('password')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['org_id']);
            $table->dropColumn(['org_id', 'phone', 'whatsapp_phone', 'has_app_access', 'escalation_level']);
            $table->string('password')->nullable(false)->change();
        });
    }
};
