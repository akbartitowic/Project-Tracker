<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_allocations', function (Blueprint $table) {
            $table->json('notified_thresholds')->nullable()->after('topup_hours');
        });
    }

    public function down(): void
    {
        Schema::table('project_allocations', function (Blueprint $table) {
            $table->dropColumn('notified_thresholds');
        });
    }
};
