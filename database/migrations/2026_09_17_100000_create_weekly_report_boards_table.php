<?php

use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A named weekly-report "board" (e.g. "Weekly Report Project", "Weekly Report
 * Management") — a distinct checklist stream with its own membership. See
 * App\Support\WeeklyReportAccess for the access model.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weekly_report_boards', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable();
            $table->timestamps();

            $table->foreign('created_by', MigrationNames::fk('wrb', 'user'))
                ->references('id')->on('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weekly_report_boards');
    }
};
