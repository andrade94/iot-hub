<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('org_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('billing_profile_id')->nullable()->constrained('billing_profiles')->nullOnDelete();
            $table->decimal('base_fee', 10, 2)->default(500);
            $table->decimal('discount_pct', 5, 2)->default(0);
            $table->string('status')->default('active'); // active|paused|cancelled
            $table->timestamp('started_at')->nullable();
            $table->string('contract_type')->default('monthly'); // monthly|annual
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
