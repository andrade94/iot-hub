<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('notify_whatsapp')->default(true);
            $table->boolean('notify_push')->default(true);
            $table->boolean('notify_email')->default(true);
            $table->string('notify_min_severity', 20)->default('low');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['notify_whatsapp', 'notify_push', 'notify_email', 'notify_min_severity']);
        });
    }
};
