<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_pitches', function (Blueprint $table) {
            $table->string('compro_url', 2048)->nullable()->after('notes');
            $table->string('proposal_url', 2048)->nullable()->after('compro_url');
            $table->string('quotation_url', 2048)->nullable()->after('proposal_url');
        });
    }

    public function down(): void
    {
        Schema::table('sales_pitches', function (Blueprint $table) {
            $table->dropColumn(['compro_url', 'proposal_url', 'quotation_url']);
        });
    }
};
