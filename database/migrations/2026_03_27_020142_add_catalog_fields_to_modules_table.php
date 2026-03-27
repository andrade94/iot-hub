<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('modules', function (Blueprint $table) {
            $table->decimal('monthly_fee', 10, 2)->nullable()->after('description');
            $table->json('required_sensor_models')->nullable()->after('monthly_fee');
            $table->json('report_types')->nullable()->after('required_sensor_models');
            $table->string('icon')->nullable()->after('report_types');
            $table->string('color')->nullable()->after('icon');
            $table->boolean('active')->default(true)->after('color');
            $table->integer('sort_order')->default(0)->after('active');
        });
    }

    public function down(): void
    {
        Schema::table('modules', function (Blueprint $table) {
            $table->dropColumn([
                'monthly_fee',
                'required_sensor_models',
                'report_types',
                'icon',
                'color',
                'active',
                'sort_order',
            ]);
        });
    }
};
