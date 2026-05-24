<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_allocations', function (Blueprint $table) {
            $table->decimal('paid_amount', 15, 2)->default(0)->after('paid_at');
        });

        DB::statement("
            UPDATE project_allocations
            SET paid_amount = COALESCE(realized_amount, amount)
            WHERE paid_at IS NOT NULL
        ");
    }

    public function down(): void
    {
        Schema::table('project_allocations', function (Blueprint $table) {
            $table->dropColumn('paid_amount');
        });
    }
};
