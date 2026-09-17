<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Free-text "next action" note per checklist item, shown alongside the description. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('weekly_report_items', function (Blueprint $table) {
            $table->text('next_action')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('weekly_report_items', function (Blueprint $table) {
            $table->dropColumn('next_action');
        });
    }
};
