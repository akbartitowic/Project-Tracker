<?php

use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** A single checklist row within a weekly-report period. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('weekly_report_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id');
            $table->foreignId('project_id')->nullable();
            $table->foreignId('reporter_id')->nullable();
            $table->text('description');
            $table->string('issue_level')->default('Medium');
            $table->date('due_date')->nullable();
            $table->boolean('is_done')->default(false);
            $table->smallInteger('sort_order')->default(0);
            $table->timestamp('last_due_reminder_sent_at')->nullable();
            $table->timestamps();

            $table->foreign('period_id', MigrationNames::fk('wri', 'period'))
                ->references('id')->on('weekly_report_periods')
                ->cascadeOnDelete();
            $table->foreign('project_id', MigrationNames::fk('wri', 'project'))
                ->references('id')->on('projects')
                ->nullOnDelete();
            $table->foreign('reporter_id', MigrationNames::fk('wri', 'user'))
                ->references('id')->on('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weekly_report_items');
    }
};
