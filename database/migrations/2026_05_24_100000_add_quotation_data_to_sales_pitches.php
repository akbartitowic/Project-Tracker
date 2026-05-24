<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_pitches', function (Blueprint $table) {
            $table->json('quotation_data')->nullable()->after('quotation_url');
        });
    }

    public function down(): void
    {
        Schema::table('sales_pitches', function (Blueprint $table) {
            $table->dropColumn('quotation_data');
        });
    }
};
