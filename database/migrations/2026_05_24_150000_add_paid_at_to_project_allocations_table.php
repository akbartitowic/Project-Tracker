<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_allocations', function (Blueprint $table) {
            $table->timestamp('paid_at')->nullable()->after('realized_at');
        });
    }

    public function down(): void
    {
        Schema::table('project_allocations', function (Blueprint $table) {
            $table->dropColumn('paid_at');
        });
    }
};
