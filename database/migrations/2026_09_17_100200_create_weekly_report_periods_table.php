<?php

use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** One week's checklist container within a board. Can be cloned into the next week via "Duplicate". */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weekly_report_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('board_id');
            $table->date('week_start');
            $table->date('week_end');
            $table->foreignId('duplicated_from_id')->nullable();
            $table->foreignId('created_by')->nullable();
            $table->timestamps();

            $table->foreign('board_id', MigrationNames::fk('wrp', 'board'))
                ->references('id')->on('weekly_report_boards')
                ->cascadeOnDelete();
            $table->foreign('duplicated_from_id', MigrationNames::fk('wrp', 'from'))
                ->references('id')->on('weekly_report_periods')
                ->nullOnDelete();
            $table->foreign('created_by', MigrationNames::fk('wrp', 'user'))
                ->references('id')->on('users')
                ->nullOnDelete();
            $table->index(['board_id', 'week_start'], MigrationNames::idx('wrp', 'board_week'));
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weekly_report_periods');
    }
};
