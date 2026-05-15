<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('presales', function (Blueprint $table) {
            $table->foreignId('sales_pitch_id')
                ->nullable()
                ->after('project_category_id')
                ->constrained('sales_pitches')
                ->nullOnDelete();
            $table->unique('sales_pitch_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('presales', function (Blueprint $table) {
            $table->dropUnique(['sales_pitch_id']);
            $table->dropForeign(['sales_pitch_id']);
            $table->dropColumn('sales_pitch_id');
        });
    }
};
