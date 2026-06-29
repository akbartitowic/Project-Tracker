<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('review_evaluations', function (Blueprint $table) {
            // trigger_type: mh_percentage | project_percentage | date_based
            $table->string('trigger_type', 30)->nullable()->after('trigger_label');
            // trigger_basis: total_mh | topup_mh (only relevant for mh_percentage)
            $table->string('trigger_basis', 20)->nullable()->after('trigger_type');
        });

        // Migrate existing data from trigger_unit → trigger_type
        DB::table('review_evaluations')->where('trigger_unit', 'manhours_percent')->update([
            'trigger_type'  => 'mh_percentage',
            'trigger_basis' => 'total_mh',
        ]);
        DB::table('review_evaluations')->where('trigger_unit', 'milestone')->update([
            'trigger_type' => 'date_based',
        ]);

        // Set default for any unmapped rows
        DB::table('review_evaluations')->whereNull('trigger_type')->update([
            'trigger_type' => 'date_based',
        ]);

        Schema::table('review_evaluations', function (Blueprint $table) {
            $table->string('trigger_type', 30)->nullable(false)->change();
            $table->dropColumn('trigger_unit');
        });
    }

    public function down(): void
    {
        Schema::table('review_evaluations', function (Blueprint $table) {
            $table->enum('trigger_unit', ['manhours_percent', 'milestone'])->default('manhours_percent')->after('trigger_value');
        });

        DB::table('review_evaluations')->where('trigger_type', 'mh_percentage')->update(['trigger_unit' => 'manhours_percent']);
        DB::table('review_evaluations')->whereIn('trigger_type', ['date_based', 'project_percentage'])->update(['trigger_unit' => 'milestone']);

        Schema::table('review_evaluations', function (Blueprint $table) {
            $table->dropColumn(['trigger_type', 'trigger_basis']);
        });
    }
};
