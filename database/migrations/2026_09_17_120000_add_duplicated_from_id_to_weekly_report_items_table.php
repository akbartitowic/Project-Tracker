<?php

use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Links a cloned item (created by "Duplicate to Next Week") back to the item it
 * was cloned from. Lets marking an item Done in a later week also mark the
 * earlier week's copy (and any other week in the same lineage) Done too.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('weekly_report_items', function (Blueprint $table) {
            $table->foreignId('duplicated_from_id')->nullable()->after('period_id');

            $table->foreign('duplicated_from_id', MigrationNames::fk('wri', 'from'))
                ->references('id')->on('weekly_report_items')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('weekly_report_items', function (Blueprint $table) {
            $table->dropForeign(MigrationNames::fk('wri', 'from'));
            $table->dropColumn('duplicated_from_id');
        });
    }
};
