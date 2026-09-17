<?php

use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Who can see/be assigned within a weekly-report board. Access to a board (and
 * eligibility as an item assignee) is derived from this list, not from a
 * generic permission alone — same idea as `project_members` for Project Board.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weekly_report_board_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('board_id');
            $table->foreignId('user_id');
            $table->timestamps();

            $table->foreign('board_id', MigrationNames::fk('wrbm', 'board'))
                ->references('id')->on('weekly_report_boards')
                ->cascadeOnDelete();
            $table->foreign('user_id', MigrationNames::fk('wrbm', 'user'))
                ->references('id')->on('users')
                ->cascadeOnDelete();
            $table->unique(['board_id', 'user_id'], MigrationNames::uq('wrbm', 'board_user'));
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weekly_report_board_members');
    }
};
