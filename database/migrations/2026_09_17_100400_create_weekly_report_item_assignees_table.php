<?php

use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Multi-assignee pivot for a weekly-report checklist item. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weekly_report_item_assignees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id');
            $table->foreignId('user_id');
            $table->timestamps();

            $table->foreign('item_id', MigrationNames::fk('wria', 'item'))
                ->references('id')->on('weekly_report_items')
                ->cascadeOnDelete();
            $table->foreign('user_id', MigrationNames::fk('wria', 'user'))
                ->references('id')->on('users')
                ->cascadeOnDelete();
            $table->unique(['item_id', 'user_id'], MigrationNames::uq('wria', 'item_user'));
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weekly_report_item_assignees');
    }
};
