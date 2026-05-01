<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_allocations', function (Blueprint $table) {
            $table->decimal('realized_amount', 15, 2)->nullable()->after('amount');
            $table->timestamp('realized_at')->nullable()->after('realized_amount');
        });
    }

    public function down(): void
    {
        Schema::table('project_allocations', function (Blueprint $table) {
            $table->dropColumn(['realized_amount', 'realized_at']);
        });
    }
};
