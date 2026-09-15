<?php

use App\Support\MigrationNames;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One agree/disagree vote per calibrator per question of a submitted review.
     * Calibration is informational only — nothing here feeds a score. The
     * verdict (per question and per submission) is derived live from these rows
     * at read time; there is no stored/locked result.
     */
    public function up(): void
    {
        Schema::create('review_calibration_votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('review_id');
            $table->foreignId('question_id');
            $table->foreignId('user_id');
            $table->boolean('agree');
            $table->timestamps();

            $table->foreign('review_id', MigrationNames::fk('rcv', 'review'))
                ->references('id')->on('project_reviews')->cascadeOnDelete();
            $table->foreign('question_id', MigrationNames::fk('rcv', 'question'))
                ->references('id')->on('review_questions')->cascadeOnDelete();
            $table->foreign('user_id', MigrationNames::fk('rcv', 'user'))
                ->references('id')->on('users')->cascadeOnDelete();

            // 1 vote per (calibrator, question, submission) — changeable, not additive.
            $table->unique(['review_id', 'question_id', 'user_id'], MigrationNames::uq('rcv', 'review_q_user'));
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('review_calibration_votes');
    }
};
