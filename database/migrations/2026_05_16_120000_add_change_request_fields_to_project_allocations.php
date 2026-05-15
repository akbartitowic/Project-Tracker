<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_allocations', function (Blueprint $table) {
            $table->date('cr_date')->nullable()->after('topup_hours');
            $table->string('cr_feature')->nullable()->after('cr_date');
            $table->boolean('is_change_request')->default(false)->after('cr_feature');
        });
    }

    public function down(): void
    {
        Schema::table('project_allocations', function (Blueprint $table) {
            $table->dropColumn(['cr_date', 'cr_feature', 'is_change_request']);
        });
    }
};
