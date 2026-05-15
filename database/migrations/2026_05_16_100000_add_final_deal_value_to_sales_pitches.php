<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_pitches', function (Blueprint $table) {
            $table->decimal('final_deal_value', 15, 2)->nullable()->after('estimated_value');
        });
    }

    public function down(): void
    {
        Schema::table('sales_pitches', function (Blueprint $table) {
            $table->dropColumn('final_deal_value');
        });
    }
};
