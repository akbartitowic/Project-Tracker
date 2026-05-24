<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_pitches', function (Blueprint $table) {
            $table->string('quotation_logo_path')->nullable()->after('quotation_data');
        });
    }

    public function down(): void
    {
        Schema::table('sales_pitches', function (Blueprint $table) {
            $table->dropColumn('quotation_logo_path');
        });
    }
};
